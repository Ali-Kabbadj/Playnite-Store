using GamesNexus.App;
using GamesNexus.Core;
using GamesNexus.Models;
using Playnite.SDK;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;

namespace GamesNexus.ViewModels
{
    public class MainViewModel : ViewModelBase
    {
        private static readonly ILogger logger = LogManager.GetLogger();

        public CatalogViewModel CatalogVM { get; }
        public DownloadViewModel DownloadVM { get; }
        public SettingsViewModel SettingsVM { get; }

        private string _activeTab = "Catalog";
        public string ActiveTab
        {
            get => _activeTab;
            set
            {
                if (SetProperty(ref _activeTab, value))
                {
                    OnPropertyChanged(nameof(IsCatalogVisible));
                    OnPropertyChanged(nameof(IsDownloadsVisible));
                    OnPropertyChanged(nameof(IsInstalledVisible));
                    OnPropertyChanged(nameof(IsSettingsVisible));
                }
            }
        }

        public bool IsCatalogVisible => ActiveTab == "Catalog";
        public bool IsDownloadsVisible => ActiveTab == "Downloads";
        public bool IsInstalledVisible => ActiveTab == "Installed";
        public bool IsSettingsVisible => ActiveTab == "Settings";

        public ICommand SwitchTabCommand { get; }
        public ICommand RefreshCommand { get; }

        public ObservableCollection<InstalledGame> InstalledGames { get; } = new ObservableCollection<InstalledGame>();
        public List<Game> AllGames => CatalogVM.Games.ToList();

        public MainViewModel()
        {
            CatalogVM = new CatalogViewModel();
            DownloadVM = new DownloadViewModel();
            SettingsVM = new SettingsViewModel();

            SwitchTabCommand = new Core.RelayCommand(ExecuteSwitchTab);
            RefreshCommand = new Core.RelayCommand(_ => _ = RefreshAsync());

            LoadInstalledGames();
        }

        private void ExecuteSwitchTab(object parameter)
        {
            if (parameter is string tabName)
            {
                ActiveTab = tabName;
            }
        }

        private async Task RefreshAsync()
        {
            await CatalogVM.LoadGamesAsync(true);
        }

        public void LoadInstalledGames()
        {
            try
            {
                var cache = GamesNexusContext.Cache;
                if (cache == null) return;
                var installed = cache.GetInstalledGames();
                InstalledGames.Clear();
                foreach (var g in installed)
                    InstalledGames.Add(g);
            }
            catch (Exception ex)
            {
                logger.Error(ex, "Failed to load installed games");
            }
        }

        public void MergeGameState(ObservableCollection<Game> games)
        {
            _ = games;
        }

        public void Stop()
        {
            CatalogVM.Stop();
        }
    }
}