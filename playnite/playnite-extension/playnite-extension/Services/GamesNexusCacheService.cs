using Newtonsoft.Json;
using GamesNexus.Models;
using System;
using System.Collections.Generic;
using System.IO;

namespace GamesNexus.Services
{
    public class GamesNexusCacheService
    {
        private readonly string _cacheDir;
        private readonly Dictionary<string, CacheEntry> _memCache = new Dictionary<string, CacheEntry>();

        private class CacheEntry
        {
            public string Data { get; set; }
            public DateTime ExpiresAt { get; set; }
        }

        public GamesNexusCacheService(string appDataDir)
        {
            _cacheDir = Path.Combine(appDataDir, "GamesNexusCache");
            Directory.CreateDirectory(_cacheDir);
        }

        public void Set<T>(string key, T value, TimeSpan? ttl = null)
        {
            var json = JsonConvert.SerializeObject(value);
            var entry = new CacheEntry { Data = json, ExpiresAt = DateTime.UtcNow.Add(ttl ?? TimeSpan.FromHours(1)) };
            _memCache[key] = entry;

            var filePath = GetFilePath(key);
            var diskEntry = new { data = json, expiresAt = entry.ExpiresAt };
            File.WriteAllText(filePath, JsonConvert.SerializeObject(diskEntry));
        }

        public T Get<T>(string key) where T : class
        {
            if (_memCache.TryGetValue(key, out var memEntry))
            {
                if (memEntry.ExpiresAt > DateTime.UtcNow)
                    return JsonConvert.DeserializeObject<T>(memEntry.Data);
                _memCache.Remove(key);
            }

            var filePath = GetFilePath(key);
            if (File.Exists(filePath))
            {
                try
                {
                    var diskJson = File.ReadAllText(filePath);
                    var diskEntry = JsonConvert.DeserializeAnonymousType(diskJson, new { data = "", expiresAt = DateTime.MinValue });
                    if (diskEntry.expiresAt > DateTime.UtcNow)
                    {
                        _memCache[key] = new CacheEntry { Data = diskEntry.data, ExpiresAt = diskEntry.expiresAt };
                        return JsonConvert.DeserializeObject<T>(diskEntry.data);
                    }
                    File.Delete(filePath);
                }
                catch { File.Delete(filePath); }
            }

            return null;
        }

        public void SetSettings(GamesNexusAppSettings settings)
        {
            Set("settings", settings, TimeSpan.FromDays(365));
        }

        public GamesNexusAppSettings GetSettings()
        {
            return Get<GamesNexusAppSettings>("settings") ?? new GamesNexusAppSettings();
        }

        public void SetInstalledGames(List<InstalledGame> games)
        {
            Set("installed", games, TimeSpan.FromDays(365));
        }

        public List<InstalledGame> GetInstalledGames()
        {
            return Get<List<InstalledGame>>("installed") ?? new List<InstalledGame>();
        }

        private string GetFilePath(string key)
        {
            using (var md5 = System.Security.Cryptography.MD5.Create())
            {
                var bytes = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(key));
                var hash = BitConverter.ToString(bytes).Replace("-", "").ToLower();
                return Path.Combine(_cacheDir, hash + ".json");
            }
        }

        public void Clear()
        {
            _memCache.Clear();
            if (Directory.Exists(_cacheDir))
            {
                foreach (var f in Directory.GetFiles(_cacheDir, "*.json"))
                    File.Delete(f);
            }
        }
    }
}