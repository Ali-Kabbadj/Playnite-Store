using Newtonsoft.Json;
using GamesNexus.Core;

namespace GamesNexus.Models
{
    public class InstallTask : ViewModelBase
    {
        [JsonProperty("id")] public string Id { get; set; }
        [JsonProperty("gameId")] public string GameId { get; set; }
        [JsonProperty("title")] public string Title { get; set; }

        private string _status;
        [JsonProperty("status")]
        public string Status
        {
            get => _status;
            set { SetProperty(ref _status, value); OnPropertyChanged(nameof(StatusDisplay)); }
        }

        private double _progress;
        [JsonProperty("progress")]
        public double Progress
        {
            get => _progress;
            set { SetProperty(ref _progress, value); OnPropertyChanged(nameof(ProgressDisplay)); }
        }

        [JsonProperty("setupPath")] public string SetupPath { get; set; }
        [JsonProperty("installDir")] public string InstallDir { get; set; }

        public string ProgressDisplay => $"{Progress:F0}%";
        public string StatusDisplay => Status ?? "Unknown";
    }

    public class InstalledGame
    {
        public string GameId { get; set; }
        public string Title { get; set; }
        public string InstallDir { get; set; }
        public string SetupPath { get; set; }
    }
}