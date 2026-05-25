using Newtonsoft.Json;
using GamesNexus.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Media.Imaging;
using System.Collections.Concurrent;
using System.Windows;

namespace GamesNexus.Services
{
    public class GamesNexusApiService
    {
        private readonly HttpClient _client;
        private readonly SemaphoreSlim _imageSemaphore = new SemaphoreSlim(10, 10);
        private readonly string _imageCacheDir;

        private string _baseUrl;
        public string BaseUrl
        {
            get => _baseUrl;
            set
            {
                _baseUrl = value.TrimEnd('/');
                _memCache.Clear();
            }
        }

        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);
        private class CacheEntry { public object Value { get; set; } public DateTime AddedAt { get; set; } }
        private readonly ConcurrentDictionary<string, CacheEntry> _memCache = new ConcurrentDictionary<string, CacheEntry>();

        public GamesNexusApiService(string baseUrl, string imageCacheDir = null)
        {
            System.Net.ServicePointManager.DefaultConnectionLimit = 50;
            System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12;
            _client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
            _client.DefaultRequestHeaders.Add("User-Agent", "Playnite-GamesNexus/1.0");
            _baseUrl = baseUrl.TrimEnd('/');
            _imageCacheDir = imageCacheDir != null
                ? Path.Combine(imageCacheDir, "Images")
                : null;
            if (_imageCacheDir != null)
                Directory.CreateDirectory(_imageCacheDir);
        }

        public void CancelPendingRequests() { try { _client?.CancelPendingRequests(); } catch { } }

        private T CacheGet<T>(string key) where T : class
        {
            if (_memCache.TryGetValue(key, out var entry) && DateTime.UtcNow - entry.AddedAt < CacheTtl)
                return entry.Value as T;
            return null;
        }

        private void CacheSet<T>(string key, T value) where T : class =>
            _memCache[key] = new CacheEntry { Value = value, AddedAt = DateTime.UtcNow };

        public async Task<(List<Game> games, int total)> GetGamesAsync(
            int page, int limit, string source = null, string search = null,
            string genre = null, string sort = null, string platform = null, bool hasRepacks = true)
        {
            var url = $"{_baseUrl}/api/v1/games?page={page}&limit={limit}&hasRepacks={hasRepacks.ToString().ToLower()}";

            if (!string.IsNullOrEmpty(search)) url += $"&q={Uri.EscapeDataString(search)}";
            if (!string.IsNullOrEmpty(genre)) url += $"&genre={Uri.EscapeDataString(genre)}";
            if (!string.IsNullOrEmpty(platform)) url += $"&platform={Uri.EscapeDataString(platform)}";
            if (!string.IsNullOrEmpty(source)) url += $"&source={Uri.EscapeDataString(source)}";
            if (!string.IsNullOrEmpty(sort)) url += $"&sort={Uri.EscapeDataString(sort)}";

            try
            {
                var json = await _client.GetStringAsync(url).ConfigureAwait(false);
                var data = JsonConvert.DeserializeObject<PaginatedResponse<Game>>(json);
                return (data?.Data ?? new List<Game>(), data?.Total ?? 0);
            }
            catch { return (new List<Game>(), 0); }
        }

        public async Task<List<FilterOption>> GetPublishersAsync(string query = "")
        {
            try
            {
                var json = await _client.GetStringAsync($"{_baseUrl}/api/v1/publishers?q={Uri.EscapeDataString(query)}");
                return JsonConvert.DeserializeObject<List<FilterOption>>(json) ?? new List<FilterOption>();
            }
            catch { return new List<FilterOption>(); }
        }

        public async Task<List<FilterOption>> GetSourcesAsync()
        {
            try
            {
                var json = await _client.GetStringAsync($"{_baseUrl}/api/v1/sources");
                return JsonConvert.DeserializeObject<List<FilterOption>>(json) ?? new List<FilterOption>();
            }
            catch { return new List<FilterOption>(); }
        }

        public async Task<Game> GetGameByIdAsync(string id)
        {
            var cacheKey = $"game:{id}";
            var cached = CacheGet<Game>(cacheKey);
            if (cached != null) return cached;

            try
            {
                var json = await _client.GetStringAsync($"{_baseUrl}/api/v1/games/{id}").ConfigureAwait(false);
                var game = JsonConvert.DeserializeObject<Game>(json);
                if (game != null) CacheSet(cacheKey, game);
                return game;
            }
            catch { return null; }
        }

        public async Task<List<FilterOption>> GetGenresAsync()
        {
            try
            {
                var json = await _client.GetStringAsync($"{_baseUrl}/api/v1/genres");
                return JsonConvert.DeserializeObject<List<FilterOption>>(json) ?? new List<FilterOption>();
            }
            catch { return new List<FilterOption>(); }
        }

        public async Task<List<FilterOption>> GetPlatformsAsync()
        {
            try
            {
                var json = await _client.GetStringAsync($"{_baseUrl}/api/v1/platforms");
                return JsonConvert.DeserializeObject<List<FilterOption>>(json) ?? new List<FilterOption>();
            }
            catch { return new List<FilterOption>(); }
        }

        public async Task<BitmapImage> GetCachedImageAsync(string url, int? decodeWidth = null)
        {
            if (string.IsNullOrEmpty(url)) return null;

            var cacheKey = $"img_{url.GetHashCode()}_{decodeWidth ?? 0}";
            var cachedImg = CacheGet<BitmapImage>(cacheKey);
            if (cachedImg != null) return cachedImg;

            // Check disk cache first
            string diskPath = null;
            try { diskPath = GetImageCachePath(url, decodeWidth); }
            catch { }
            if (diskPath != null && File.Exists(diskPath))
            {
                try
                {
                    var img = LoadBitmapFromFile(diskPath, decodeWidth);
                    if (img != null)
                    {
                        CacheSet(cacheKey, img);
                        return img;
                    }
                }
                catch { }
            }

            await _imageSemaphore.WaitAsync();
            try
            {
                var proxyUrl = $"https://wsrv.nl/?url={Uri.EscapeDataString(url)}&output=webp";
                var data = await _client.GetByteArrayAsync(proxyUrl).ConfigureAwait(false);
                var img = BytesToBitmapImage(data, decodeWidth);

                if (img != null)
                {
                    CacheSet(cacheKey, img);
                    // Save to disk cache
                    if (diskPath != null)
                    {
                        try { File.WriteAllBytes(diskPath, data); }
                        catch { }
                    }
                    return img;
                }
            }
            catch { }
            finally { _imageSemaphore.Release(); }

            return null;
        }

        public string GetImageCachePath(string url, int? decodeWidth)
        {
            if (_imageCacheDir == null) return null;
            using (var md5 = System.Security.Cryptography.MD5.Create())
            {
                var bytes = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes($"{url}_{decodeWidth ?? 0}"));
                var hash = BitConverter.ToString(bytes).Replace("-", "").ToLower();
                return Path.Combine(_imageCacheDir, hash + ".webp");
            }
        }

        private static BitmapImage LoadBitmapFromFile(string path, int? decodeWidth = null)
        {
            try
            {
                var img = new BitmapImage();
                img.BeginInit();
                img.CacheOption = BitmapCacheOption.OnLoad;
                if (decodeWidth.HasValue)
                    img.DecodePixelWidth = decodeWidth.Value;
                img.UriSource = new Uri(path, UriKind.Absolute);
                img.EndInit();
                img.Freeze();
                return img;
            }
            catch { return null; }
        }

        private static BitmapImage BytesToBitmapImage(byte[] data, int? decodeWidth = null)
        {
            if (data == null || data.Length == 0) return null;
            try
            {
                var img = new BitmapImage();
                img.BeginInit();
                img.CacheOption = BitmapCacheOption.OnLoad;
                if (decodeWidth.HasValue)
                    img.DecodePixelWidth = decodeWidth.Value;
                img.StreamSource = new MemoryStream(data);
                img.EndInit();
                img.Freeze();
                return img;
            }
            catch { return null; }
        }

        public BitmapImage TrimTransparentEdges(BitmapImage source, int padding = 2, byte alphaThreshold = 20)
        {
            try
            {
                int w = source.PixelWidth, h = source.PixelHeight;
                int stride = w * 4;
                byte[] pixels = new byte[h * stride];
                source.CopyPixels(pixels, stride, 0);

                int minX = w, maxX = 0, minY = h, maxY = 0;
                for (int y = 0; y < h; y++)
                {
                    for (int x = 0; x < w; x++)
                    {
                        int idx = y * stride + x * 4;
                        if (pixels[idx + 3] > alphaThreshold)
                        {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                if (minX > maxX || minY > maxY) return null;

                minX = Math.Max(0, minX - padding);
                minY = Math.Max(0, minY - padding);
                maxX = Math.Min(w - 1, maxX + padding);
                maxY = Math.Min(h - 1, maxY + padding);

                var cropped = new CroppedBitmap(source, new Int32Rect(minX, minY, maxX - minX + 1, maxY - minY + 1));
                var encoder = new PngBitmapEncoder();
                encoder.Frames.Add(BitmapFrame.Create(cropped));
                using (var ms = new MemoryStream())
                {
                    encoder.Save(ms);
                    ms.Position = 0;
                    var result = new BitmapImage();
                    result.BeginInit();
                    result.CacheOption = BitmapCacheOption.OnLoad;
                    result.StreamSource = ms;
                    result.EndInit();
                    result.Freeze();
                    return result;
                }
            }
            catch { return null; }
        }
    }
}