using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Windows.Media.Imaging;

namespace GamesNexus.Services
{
    public static class IconLoader
    {
        private static readonly Dictionary<string, BitmapImage> _cache = new Dictionary<string, BitmapImage>(StringComparer.OrdinalIgnoreCase);
        private static string _resourcesPath;

        public static string ToSlug(string name)
        {
            if (string.IsNullOrEmpty(name)) return "";
            var slug = name.ToLowerInvariant();
            var chars = new char[slug.Length];
            int idx = 0;
            foreach (char c in slug)
                if (char.IsLetterOrDigit(c) || c == ' ' || c == '-')
                    chars[idx++] = c;
            slug = new string(chars, 0, idx);
            slug = slug.Replace(' ', '-');
            while (slug.Contains("--")) slug = slug.Replace("--", "-");
            return slug.Trim('-');
        }

        private static string GetResourcesPath()
        {
            if (_resourcesPath != null) return _resourcesPath;
            try { _resourcesPath = Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), "Resources"); }
            catch { _resourcesPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources"); }
            return _resourcesPath;
        }

        public static BitmapImage LoadIcon(string relativePath)
        {
            if (string.IsNullOrEmpty(relativePath)) return null;
            if (_cache.TryGetValue(relativePath, out var cached)) return cached;

            var path = Path.Combine(GetResourcesPath(), relativePath);
            if (!File.Exists(path)) { _cache[relativePath] = null; return null; }

            try
            {
                var img = new BitmapImage();
                img.BeginInit();
                img.CacheOption = BitmapCacheOption.OnLoad;
                img.UriSource = new Uri(path, UriKind.Absolute);
                img.EndInit();
                img.Freeze();
                _cache[relativePath] = img;
                return img;
            }
            catch
            {
                _cache[relativePath] = null;
                return null;
            }
        }

        public static void ClearCache() => _cache.Clear();
    }
}
