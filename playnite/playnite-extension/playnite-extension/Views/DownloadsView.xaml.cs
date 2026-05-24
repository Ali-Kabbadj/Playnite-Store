using GamesNexus.App;
using GamesNexus.Models;
using System.Windows;
using System.Windows.Controls;

namespace GamesNexus.Views
{
    public partial class DownloadsView : UserControl
    {
        public DownloadsView()
        {
            InitializeComponent();
        }

        private void DownloadPause_Click(object sender, RoutedEventArgs e)
        {
            Button button = sender as Button;
            if (button == null)
                return;

            Download dl = button.Tag as Download;
            if (dl == null)
                return;

            GamesNexusContext.DownloadManager.PauseResumeDownload(dl.Id);
        }

        private void DownloadRemove_Click(object sender, RoutedEventArgs e)
        {
            Button button = sender as Button;
            if (button == null)
                return;

            Download dl = button.Tag as Download;
            if (dl == null)
                return;

            var res = MessageBox.Show(
                "Are you sure you want to cancel downloading " + dl.Title + "?",
                "Cancel Download",
                MessageBoxButton.YesNo,
                MessageBoxImage.Warning);

            if (res == MessageBoxResult.Yes)
            {
                GamesNexusContext.DownloadManager.CancelDownload(dl.Id);
            }
        }
    }
}