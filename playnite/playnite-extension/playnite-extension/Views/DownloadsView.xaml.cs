using GamesNexus.App;
using GamesNexus.Models;
using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;

namespace GamesNexus.Views
{
    public partial class DownloadsView : UserControl
    {
        public List<Download> AllDownloads { get; set; } = new List<Download>();
        public List<InstallTask> AllInstalls { get; set; } = new List<InstallTask>();

        public DownloadsView()
        {
            InitializeComponent();
        }

        public void RefreshUI()
        {
            DownloadsList.ItemsSource = null;
            DownloadsList.ItemsSource = AllDownloads;
            InstallsList.ItemsSource = null;
            InstallsList.ItemsSource = AllInstalls;
        }

        private async void RefreshDownloads_Click(object sender, RoutedEventArgs e)
        {
        }

        private void DownloadPlay_Click(object sender, RoutedEventArgs e)
        {
        }

        private void DownloadPause_Click(object sender, RoutedEventArgs e)
        {
        }

        private void DownloadRemove_Click(object sender, RoutedEventArgs e)
        {
        }

        private async void InstallFromCompleted_Click(object sender, RoutedEventArgs e)
        {
        }
    }
}
