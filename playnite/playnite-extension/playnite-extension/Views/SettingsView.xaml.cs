using GamesNexus.App;
using GamesNexus.ViewModels;
using System;
using System.Windows;
using System.Windows.Controls;

namespace GamesNexus.Views
{
    public partial class SettingsView : UserControl
    {
        private SettingsViewModel Settings => (DataContext as MainViewModel)?.SettingsVM;

        public SettingsView()
        {
            InitializeComponent();
        }

        private void SaveApiUrl_Click(object sender, RoutedEventArgs e)
        {
            if (Settings != null) Settings.ApiUrl = ApiUrlBox.Text;
            MessageBox.Show("Settings saved. Restart to apply new API URL.", "Settings", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void BrowseInstallPath_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new System.Windows.Forms.FolderBrowserDialog();
            if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
            {
                InstallPathBox.Text = dialog.SelectedPath;
                if (Settings != null) Settings.InstallDir = dialog.SelectedPath;
            }
        }

        private void ClearCache_Click(object sender, RoutedEventArgs e)
        {
            GamesNexusContext.Cache?.Clear();
            MessageBox.Show("Cache cleared.", "Cache", MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }
}
