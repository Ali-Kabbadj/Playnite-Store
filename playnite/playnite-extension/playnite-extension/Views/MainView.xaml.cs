using GamesNexus.App;
using GamesNexus.Models;
using GamesNexus.ViewModels;
using Playnite.SDK;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;

namespace GamesNexus.Views
{
    public partial class MainView : UserControl
    {
        private static readonly ILogger logger = LogManager.GetLogger();
        private MainViewModel VM => DataContext as MainViewModel;
        private bool _loaded;

        public MainView()
        {
            DataContext = GamesNexusContext.MainVM;
            InitializeComponent();
            WireEvents();
            Loaded += OnLoaded;
        }

        private void WireEvents()
        {
            CatalogCtrl.HeroImageChanged += OnHeroImageChanged;
            CatalogCtrl.ScreenshotClicked += OnScreenshotClicked;
        }

        private async void OnLoaded(object sender, RoutedEventArgs e)
        {
            if (_loaded) return;
            _loaded = true;

            var vm = VM;
            if (vm == null) return;

            await CatalogCtrl.LoadGamesAsync();
            await CatalogCtrl.LoadFilterSourcesAsync();
            await CatalogCtrl.LoadFilterPlatformsAsync();
        }

        private void OnHeroImageChanged(BitmapSource bmp)
        {
            SidebarHeroImage.Source = bmp;
        }

        private void OnScreenshotClicked(List<string> screenshots, int index)
        {
            ScreenshotViewerCtrl.Open(screenshots, index);
        }

        #region Tab Switching
        private void Tab_Checked(object sender, RoutedEventArgs e)
        {
            if (!(sender is RadioButton rb) || !(rb.Tag is string tag)) return;
            SwitchTab(tag);
        }

        private void SwitchTab(string tab)
        {
            VM?.SwitchTabCommand.Execute(tab);
            if (CatalogGrid == null) return;
            CatalogGrid.Visibility = tab == "Catalog" ? Visibility.Visible : Visibility.Collapsed;
            DownloadsGrid.Visibility = tab == "Downloads" ? Visibility.Visible : Visibility.Collapsed;
            InstalledGrid.Visibility = tab == "Installed" ? Visibility.Visible : Visibility.Collapsed;
            SettingsGrid.Visibility = tab == "Settings" ? Visibility.Visible : Visibility.Collapsed;
        }
        #endregion
    }
}