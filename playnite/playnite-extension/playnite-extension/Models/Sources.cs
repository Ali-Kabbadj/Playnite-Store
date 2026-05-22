using Newtonsoft.Json;
using System.Collections.Generic;
using System.Linq;
using System.Windows.Media.Imaging;
using GamesNexus.Core;

namespace GamesNexus.Models
{
    public class DownloadSource : ViewModelBase
    {
        [JsonProperty("id")] public string Id { get; set; }
        [JsonProperty("name")] public string Name { get; set; }
        [JsonProperty("url")] public string Url { get; set; }
        [JsonProperty("type")] public string Type { get; set; }
        [JsonProperty("downloader")] public string Downloader { get; set; }
        [JsonProperty("iconUrl")] public string IconUrl { get; set; }

        private BitmapImage _iconBitmap;
        [JsonIgnore]
        public BitmapImage IconBitmap
        {
            get => _iconBitmap;
            set => SetProperty(ref _iconBitmap, value);
        }

        [JsonIgnore] public string InstallButtonText { get; set; } = "Install";
    }

    public class SourcesResponse
    {
        [JsonProperty("sources")] public List<CloudSource> Sources { get; set; }
        [JsonProperty("total")] public int Total { get; set; }
    }

    public class CloudStats
    {
        [JsonProperty("installs")] public int Installs { get; set; }
        [JsonProperty("copies")] public int Copies { get; set; }
        [JsonProperty("recentActivity")] public int RecentActivity { get; set; }
    }

    public class CloudRating
    {
        [JsonProperty("avg")] public double Avg { get; set; }
        [JsonProperty("total")] public int Total { get; set; }
    }

    public class CloudDownloadOption
    {
        [JsonProperty("name")] public string Name { get; set; }
        [JsonProperty("count")] public int Count { get; set; }
    }

    public class CloudSource : ViewModelBase
    {
        [JsonProperty("id")] public int Id { get; set; }
        [JsonProperty("title")] public string Title { get; set; }
        [JsonProperty("description")] public string Description { get; set; }
        [JsonProperty("url")] public string Url { get; set; }
        [JsonProperty("gamesCount")] public int GamesCount { get; set; }
        [JsonProperty("status")] public List<string> Status { get; set; }
        [JsonProperty("addedDate")] public string AddedDate { get; set; }
        [JsonProperty("stats")] public CloudStats Stats { get; set; }
        [JsonProperty("rating")] public CloudRating Rating { get; set; }
        [JsonProperty("topDownloadOption")] public List<CloudDownloadOption> TopDownloadOption { get; set; }
        [JsonProperty("iconUrl")] public string IconUrl { get; set; }

        private bool _installed;
        [JsonProperty("installed")]
        public bool Installed
        {
            get => _installed;
            set { SetProperty(ref _installed, value); OnPropertyChanged(nameof(ButtonText)); OnPropertyChanged(nameof(ButtonColor)); }
        }

        [JsonIgnore] public string ButtonText => Installed ? "Uninstall" : "Install";
        [JsonIgnore] public string ButtonColor => Installed ? "#FF453A" : "#0379FF";
        [JsonIgnore] public string GamesCountDisplay => GamesCount > 0 ? $"{GamesCount:N0}" : "0";
        [JsonIgnore] public string InstallsDisplay => Stats?.Installs > 0 ? $"{Stats.Installs:N0}" : "0";
        [JsonIgnore] public string RatingDisplay => Rating?.Avg > 0 ? $"{Rating.Avg:F1} ({Rating.Total})" : "N/A";
        [JsonIgnore] public string StatusBadges => Status != null ? string.Join(", ", Status) : "";
        [JsonIgnore] public string DownloadTypes => TopDownloadOption != null ? string.Join(", ", TopDownloadOption.Select(o => o.Name)) : "";

        private BitmapImage _iconBitmap;
        [JsonIgnore]
        public BitmapImage IconBitmap
        {
            get => _iconBitmap;
            set => SetProperty(ref _iconBitmap, value);
        }
    }

    public class SearchResponse
    {
        [JsonProperty("query")] public string Query { get; set; }
        [JsonProperty("total")] public int Total { get; set; }
        [JsonProperty("results")] public List<SearchResult> Results { get; set; }
    }

    public class SearchResult
    {
        [JsonProperty("matchScore")] public double MatchScore { get; set; }
        [JsonProperty("game")] public Game Game { get; set; }
    }
}