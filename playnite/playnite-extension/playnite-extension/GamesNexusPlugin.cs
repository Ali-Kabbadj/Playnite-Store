using GamesNexus.App;
using GamesNexus.Services;
using GamesNexus.ViewModels;
using GamesNexus.Views;
using Playnite.SDK;
using Playnite.SDK.Plugins;
using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;

namespace GamesNexus
{
    public class GamesNexusPlugin : GenericPlugin
    {
        private static readonly ILogger logger = LogManager.GetLogger();
        public override Guid Id { get; } = Guid.Parse("d827618c-3c3b-48bc-9f17-1f4a9b8e0101");

        public GamesNexusPlugin(IPlayniteAPI api) : base(api)
        {
            GamesNexusContext.Initialize(api);
            Properties = new GenericPluginProperties { HasSettings = true };

            var _ = System.Windows.Application.Current.Dispatcher.BeginInvoke(new Action(() =>
            {
                RegisterThemeResources();
            }));
        }

        public override ISettings GetSettings(bool firstRunSettings)
        {
            return GamesNexusContext.MainVM.SettingsVM;
        }

        public override UserControl GetSettingsView(bool firstRunSettings)
        {
            return new SettingsView();
        }

        private void RegisterThemeResources()
        {
            try
            {
                var resources = System.Windows.Application.Current.Resources;
                var catalog = GamesNexusContext.MainVM.CatalogVM;

                resources.Remove("GamesNexusCatalog");
                resources.Add("GamesNexusCatalog", catalog);

                resources.Remove("GamesNexusCommands");
                resources.Add("GamesNexusCommands", new StoreCommandsWrapper(catalog));

                resources.Remove("GamesNexusMainVM");
                resources.Add("GamesNexusMainVM", GamesNexusContext.MainVM);

                // Wire up infinite scroll and other behaviors after theme is loaded
                var _ = System.Windows.Application.Current.Dispatcher.BeginInvoke(
                    new Action(() => ThemeIntegrationService.WireAll()),
                    System.Windows.Threading.DispatcherPriority.Loaded);
            }
            catch (Exception ex)
            {
                logger.Error(ex, "Failed to register theme resources");
            }
        }

        public override IEnumerable<SidebarItem> GetSidebarItems()
        {
            var isFullscreen = PlayniteApi.ApplicationInfo.Mode == ApplicationMode.Fullscreen;
            if (isFullscreen)
            {
                var themeSupported = ThemeIntegrationService.IsThemeStoreSupported();
                if (themeSupported)
                {
                    yield return new SidebarItem
                    {
                        Title = "Games Nexus Store",
                        Type = SiderbarItemType.Button,
                        Icon = new TextBlock { Text = "\U0001f6d2", FontFamily = new System.Windows.Media.FontFamily("Segoe UI Emoji") },
                        Opened = () =>
                        {
                            ThemeIntegrationService.ToggleStore();
                            return null;
                        }
                    };
                    yield break;
                }
            }

            yield return new SidebarItem
            {
                Title = "Games Nexus",
                Type = SiderbarItemType.View,
                Icon = new TextBlock { Text = "\U0001f6d2", FontFamily = new System.Windows.Media.FontFamily("Segoe UI Emoji") },
                Opened = () =>
                {
                    if (GamesNexusContext.CachedView == null)
                        GamesNexusContext.CachedView = new MainView();
                    return GamesNexusContext.CachedView;
                }
            };
        }
    }

    public class StoreCommandsWrapper
    {
        public CatalogViewModel Catalog { get; }

        public StoreCommandsWrapper(CatalogViewModel catalog)
        {
            Catalog = catalog;
        }

        public System.Windows.Input.ICommand ToggleStore => Catalog.ToggleStoreCommand;
        public System.Windows.Input.ICommand SelectGameById => Catalog.SelectGameByIdCommand;
        public System.Windows.Input.ICommand DownloadRepack => Catalog.DownloadRepackCommand;
        public System.Windows.Input.ICommand FilterByGenre => Catalog.FilterByGenreCommand;
        public System.Windows.Input.ICommand FilterBySource => Catalog.FilterBySourceCommand;
        public System.Windows.Input.ICommand FilterByPlatform => Catalog.FilterByPlatformCommand;
        public System.Windows.Input.ICommand SortBy => Catalog.SortByCommand;
        public System.Windows.Input.ICommand Search => Catalog.SearchCommand;
        public System.Windows.Input.ICommand LoadNextPage => Catalog.LoadNextPageCommand;
        public System.Windows.Input.ICommand CloseSidebar => Catalog.CloseSidebarCommand;
    }
}