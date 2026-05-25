using GamesNexus.Models;
using GamesNexus.Services;
using GamesNexus.ViewModels;
using Playnite.SDK;
using System;
using System.IO;
using System.Windows; // REQUIRED FOR APPLICATION.CURRENT
using System.Windows.Controls;

namespace GamesNexus.App
{
    public static class GamesNexusContext
    {
        public static IPlayniteAPI PlayniteApi { get; private set; }
        public static GamesNexusApiService Api { get; private set; }
        public static GamesNexusCacheService Cache { get; private set; }
        public static GamesNexusAppSettings Settings { get; private set; }
        public static MainViewModel MainVM { get; private set; }
        public static UserControl CachedView { get; set; }
        public static DownloadManagerService DownloadManager { get; private set; }

        public static void Initialize(IPlayniteAPI playniteApi)
        {
            PlayniteApi = playniteApi;
            var appDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GamesNexus");
            Cache = new GamesNexusCacheService(appDir);
            Settings = Cache.GetSettings() ?? new GamesNexusAppSettings();
            Api = new GamesNexusApiService(Settings.ApiUrl, appDir);
            DownloadManager = new DownloadManagerService();
            MainVM = new MainViewModel();
            Application.Current.Resources.Remove("GamesNexusCatalog");
            Application.Current.Resources.Add("GamesNexusCatalog", MainVM.CatalogVM);
            _ = MainVM.CatalogVM.LoadGamesAsync(true);
        }
    }
}