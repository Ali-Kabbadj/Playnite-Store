using Newtonsoft.Json;
using System.Collections.Generic;
using GamesNexus.Core;

namespace GamesNexus.Models
{
    public class TorrentFileMeta
    {
        [JsonProperty("index")] public int Index { get; set; }
        [JsonProperty("name")] public string Name { get; set; }
        [JsonProperty("path")] public string Path { get; set; }
        [JsonProperty("length")] public long Length { get; set; }
    }

    public class Download : ViewModelBase
    {
        [JsonProperty("id")] public string Id { get; set; }
        [JsonProperty("title")] public string Title { get; set; }
        [JsonProperty("gameId")] public string GameId { get; set; }

        private string _status;
        [JsonProperty("status")]
        public string Status
        {
            get => _status;
            set { SetProperty(ref _status, value); OnPropertyChanged(nameof(StatusName)); }
        }

        private double _progress;
        [JsonProperty("progress")]
        public double Progress
        {
            get => _progress;
            set { SetProperty(ref _progress, value); OnPropertyChanged(nameof(ProgressDisplay)); }
        }

        private double _downloadSpeed;
        [JsonProperty("downloadSpeed")]
        public double DownloadSpeed
        {
            get => _downloadSpeed;
            set { SetProperty(ref _downloadSpeed, value); OnPropertyChanged(nameof(SpeedDisplay)); }
        }

        private int _peers;
        [JsonProperty("peers")]
        public int Peers
        {
            get => _peers;
            set { SetProperty(ref _peers, value); OnPropertyChanged(nameof(PeersDisplay)); }
        }

        private int _seeds;
        [JsonProperty("seeds")]
        public int Seeds
        {
            get => _seeds;
            set { SetProperty(ref _seeds, value); OnPropertyChanged(nameof(PeersDisplay)); }
        }

        private int _eta;
        [JsonProperty("eta")]
        public int Eta
        {
            get => _eta;
            set { SetProperty(ref _eta, value); OnPropertyChanged(nameof(EtaDisplay)); }
        }

        [JsonProperty("files")] public List<TorrentFileMeta> Files { get; set; }
        [JsonProperty("selectedFiles")] public List<int> SelectedFiles { get; set; }

        public string StatusName => Status ?? "Unknown";
        public string ProgressDisplay => $"{Progress:F1}%";
        public string PeersDisplay => $"{Peers}/{Seeds}";
        public string SpeedDisplay
        {
            get
            {
                if (DownloadSpeed <= 0) return "0 B/s";
                var speeds = new[] { "B/s", "KB/s", "MB/s", "GB/s" };
                var i = 0;
                var s = DownloadSpeed;
                while (s >= 1024 && i < speeds.Length - 1) { s /= 1024; i++; }
                return $"{s:F1} {speeds[i]}";
            }
        }
        public string EtaDisplay
        {
            get
            {
                if (Eta <= 0) return "—";
                if (Eta < 60) return $"{Eta}s";
                if (Eta < 3600) return $"{Eta / 60}m {Eta % 60}s";
                return $"{Eta / 3600}h {(Eta % 3600) / 60}m";
            }
        }
    }
}