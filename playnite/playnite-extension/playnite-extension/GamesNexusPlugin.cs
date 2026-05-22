using GamesNexus.App;
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
            Properties = new GenericPluginProperties { HasSettings = false };
            GamesNexusContext.Initialize(api);
        }

        public override IEnumerable<SidebarItem> GetSidebarItems()
        {
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
}
