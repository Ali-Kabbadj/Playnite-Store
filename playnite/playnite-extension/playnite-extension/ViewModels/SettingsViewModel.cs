using GamesNexus.Core;
using GamesNexus.Models;
using GamesNexus.Services;
using GamesNexus.App;
using System;
using System.Collections.Generic;
using System.IO;
using System.Windows.Input;
using Playnite.SDK;
using RelayCommand = GamesNexus.Core.RelayCommand;

namespace GamesNexus.ViewModels
{
    public class SettingsViewModel : ViewModelBase, ISettings
    {
        private GamesNexusAppSettings _settings;

        // 1. EXPOSE THE CATALOG FOR THE THEME
        public CatalogViewModel Catalog => GamesNexusContext.MainVM.CatalogVM;

        // 2. COMMAND TO FETCH GAMES
        public ICommand LoadStoreCommand { get; }

        // --- Settings Properties ---
        public string ApiUrl
        {
            get => _settings?.ApiUrl ?? Core.Constants.DefaultApiUrl;
            set { if (_settings != null) _settings.ApiUrl = value; Save(); }
        }
        public string InstallDir
        {
            get => _settings?.InstallDir ?? "C:\\Games";
            set { if (_settings != null) _settings.InstallDir = value; Save(); }
        }
        public bool AskDownloadDestination
        {
            get => _settings?.AskDownloadDestination ?? true;
            set { if (_settings != null) _settings.AskDownloadDestination = value; Save(); }
        }
        public string CacheDestination
        {
            get => _settings?.CacheDestination ?? "GamesNexusCache";
            set { if (_settings != null) _settings.CacheDestination = value; Save(); }
        }
        public bool AutoOpenMagnet
        {
            get => _settings?.AutoOpenMagnet ?? true;
            set { if (_settings != null) _settings.AutoOpenMagnet = value; Save(); }
        }
        public float MaxCacheGb
        {
            get => _settings?.MaxCacheGb ?? 50;
            set { if (_settings != null) _settings.MaxCacheGb = value; Save(); }
        }
        public int PollIntervalMs
        {
            get => _settings?.PollIntervalMs ?? 5000;
            set { if (_settings != null) _settings.PollIntervalMs = value; Save(); }
        }
        public string DownloadDir
        {
            get => _settings?.DownloadDir ?? "C:\\GamesNexus\\Downloads";
            set { if (_settings != null) _settings.DownloadDir = value; Save(); }
        }

        public SettingsViewModel()
        {
            var appDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GamesNexus");
            var cache = new GamesNexusCacheService(appDir);
            _settings = cache.GetSettings() ?? new GamesNexusAppSettings();

            // THIS FETCHES THE GAMES WHEN THE BUTTON IS CLICKED
            LoadStoreCommand = new RelayCommand(_ => {
                if (Catalog.Games.Count == 0)
                {
                    _ = Catalog.LoadGamesAsync(true);
                }
            });
        }

        private void Save()
        {
            if (_settings == null) return;
            var appDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GamesNexus");
            var cache = new GamesNexusCacheService(appDir);
            cache.SetSettings(_settings);
        }

        public GamesNexusAppSettings GetSettings() => _settings;
        public void BeginEdit() { }
        public void CancelEdit() { }
        public void EndEdit() { }
        public bool VerifySettings(out List<string> errors)
        {
            errors = new List<string>();
            return true;
        }
    }
}