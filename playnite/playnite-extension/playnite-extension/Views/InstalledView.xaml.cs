using GamesNexus.App;
using GamesNexus.Models;
using Playnite.SDK;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;

namespace GamesNexus.Views
{
    public partial class InstalledView : UserControl
    {
        private static readonly ILogger logger = LogManager.GetLogger();
        public List<InstalledGame> InstalledGames { get; private set; } = new List<InstalledGame>();

        public InstalledView()
        {
            InitializeComponent();
        }

        public void RefreshList()
        {
            InstalledGamesList.ItemsSource = null;
            InstalledGamesList.ItemsSource = InstalledGames;
        }

        private void InstalledPlay_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as Button)?.Tag is InstalledGame game)
            {
                try
                {
                    if (!string.IsNullOrEmpty(game.SetupPath) && File.Exists(game.SetupPath))
                        Process.Start(new ProcessStartInfo { FileName = game.SetupPath, UseShellExecute = true });
                    else if (!string.IsNullOrEmpty(game.InstallDir) && Directory.Exists(game.InstallDir))
                    {
                        var exe = Directory.GetFiles(game.InstallDir, "*.exe").FirstOrDefault();
                        if (exe != null) Process.Start(new ProcessStartInfo { FileName = exe, UseShellExecute = true });
                    }
                }
                catch (Exception ex) { logger.Error(ex, "Failed to launch game"); }
            }
        }

        private void UninstallGame_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as Button)?.Tag is InstalledGame game && InstalledGames.Remove(game))
            {
                GamesNexusContext.Cache?.SetInstalledGames(InstalledGames);
                RefreshList();
            }
        }
    }
}
