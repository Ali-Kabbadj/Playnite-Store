using GamesNexus.Core;
using GamesNexus.Models;
using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;

namespace GamesNexus.ViewModels
{
    public class DownloadViewModel : ViewModelBase
    {
        public ObservableCollection<object> ActiveDownloads { get; } = new ObservableCollection<object>();
        public ObservableCollection<object> ActiveInstalls { get; } = new ObservableCollection<object>();

        public void StartPolling(int intervalMs = 5000) { }

        public void StopPolling() { }

        public async Task<string> StartDownloadAsync(string gameId, string repackId, string title, System.Collections.Generic.List<string> uris)
        {
            return null;
        }

        public async Task PauseDownloadAsync(string downloadId) { }

        public async Task ResumeDownloadAsync(string downloadId) { }

        public async Task DeleteDownloadAsync(string downloadId) { }

        public async Task<InstallTask> StartInstallAsync(string gameId, string gameTitle, string setupPath, string installDir)
        {
            return null;
        }

        public async Task<object> GetDownloadByIdAsync(string id)
        {
            return null;
        }
    }
}
