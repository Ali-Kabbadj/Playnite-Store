using GamesNexus.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;

namespace GamesNexus.Views.Controls
{
    public partial class RepackSelectorControl : UserControl
    {
        public event Action<Repack> DownloadRequested;

        public RepackSelectorControl()
        {
            InitializeComponent();
        }

        public void LoadRepacks(List<Repack> repacks)
        {
            if (repacks == null || repacks.Count == 0)
            {
                RepackCombo.ItemsSource = null;
                DownloadBtn.IsEnabled = false;
                return;
            }

            // Sort by Date descending so newest is first
            var sorted = repacks.OrderByDescending(r => r.UploadDate ?? "").ToList();
            RepackCombo.ItemsSource = sorted;
            RepackCombo.SelectedIndex = 0;
            DownloadBtn.IsEnabled = true;
        }

        public void SetDownloadingState(bool isDownloading)
        {
            DownloadBtn.IsEnabled = !isDownloading;
            DownloadBtnText.Text = isDownloading ? "Starting..." : "Download";
        }

        private void RepackCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            DownloadBtn.IsEnabled = RepackCombo.SelectedItem != null;
        }

        private void DownloadBtn_Click(object sender, RoutedEventArgs e)
        {
            if (RepackCombo.SelectedItem is Repack selected)
            {
                DownloadRequested?.Invoke(selected);
            }
        }
    }
}