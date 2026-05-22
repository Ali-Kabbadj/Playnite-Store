using Newtonsoft.Json;
using System.Collections.Generic;
using System.Linq;
using System.Windows.Media.Imaging;
using GamesNexus.Core;

namespace GamesNexus.Models
{
    public class Game : ViewModelBase
    {
        [JsonProperty("id")] public string Id { get; set; }
        [JsonProperty("name")] public string Name { get; set; }
        [JsonProperty("summary")] public string Summary { get; set; }
        [JsonProperty("cover_url")] public string CoverUrl { get; set; }
        [JsonProperty("release_date")] public string ShallowReleaseDate { get; set; }
        [JsonProperty("rating")] public double? Rating { get; set; }
        [JsonProperty("genres")] public List<FilterOption> Genres { get; set; }
        [JsonProperty("platforms")] public List<FilterOption> Platforms { get; set; }
        [JsonProperty("developers")] public List<FilterOption> Developers { get; set; }
        [JsonProperty("publishers")] public List<FilterOption> Publishers { get; set; }
        [JsonProperty("repacks")] public List<Repack> Repacks { get; set; }
        [JsonProperty("screenshots")] public List<GameMedia> Screenshots { get; set; }
        [JsonProperty("videos")] public List<GameMedia> Videos { get; set; }
        [JsonProperty("release_dates")] public List<GameReleaseDate> ReleaseDates { get; set; }
        [JsonProperty("artworks")] public List<GameMedia> Artworks { get; set; }
        public string PlatformBadge => Platforms?.FirstOrDefault()?.Name;
        [JsonIgnore] public bool HasPlatformBadge => PlatformBadge != null;

        [JsonIgnore]
        public BitmapImage PlatformIcon
        {
            get
            {
                if (Platforms == null || Platforms.Count == 0) return null;
                var pName = Platforms[0].Name;

                if (pName.Contains("Windows")) pName = "windows";
                else if (pName.Contains("Mac")) pName = "apple-mac-os";
                else if (pName == "Linux") pName = "linux";

                var slug = Services.IconLoader.ToSlug(pName);
                return Services.IconLoader.LoadIcon($"Shared\\Platforms\\{slug}.png");
            }
        }
        [JsonIgnore] public bool HasPlatformIcon => PlatformIcon != null;
        [JsonIgnore] public bool HasPlatformText => HasPlatformBadge && !HasPlatformIcon;

        [JsonIgnore] public string PublisherBadge => Publishers?.FirstOrDefault()?.Name;
        [JsonIgnore] public bool HasPublisherBadge => !string.IsNullOrEmpty(PublisherBadge);

        [JsonIgnore]
        public List<BitmapImage> PublisherIcons
        {
            get
            {
                if (Publishers == null || Publishers.Count == 0) return null;
                var icons = new List<BitmapImage>();
                foreach (var p in Publishers)
                {
                    var img = Services.IconLoader.LoadIcon($"Shared\\Publishers\\{Services.IconLoader.ToSlug(p.Name)}.png");
                    if (img != null) icons.Add(img);
                }
                return icons;
            }
        }
        [JsonIgnore] public bool HasPublisherIcons => PublisherIcons != null && PublisherIcons.Count > 0;
        [JsonIgnore] public bool HasPublisherText => HasPublisherBadge && !HasPublisherIcons;

        private BitmapImage _coverImageBitmap;
        [JsonIgnore]
        public BitmapImage CoverImageBitmap
        {
            get => _coverImageBitmap;
            set => SetProperty(ref _coverImageBitmap, value);
        }

        private BitmapImage _heroImageBitmap;
        [JsonIgnore]
        public BitmapImage HeroImageBitmap
        {
            get => _heroImageBitmap;
            set => SetProperty(ref _heroImageBitmap, value);
        }

        private Download _activeDownload;
        [JsonIgnore]
        public Download ActiveDownload
        {
            get => _activeDownload;
            set { SetProperty(ref _activeDownload, value); OnPropertyChanged(nameof(IsDownloading)); }
        }

        private InstallTask _activeInstall;
        [JsonIgnore]
        public InstallTask ActiveInstall
        {
            get => _activeInstall;
            set { SetProperty(ref _activeInstall, value); OnPropertyChanged(nameof(IsInstalling)); }
        }

        [JsonIgnore] public bool IsDownloading => ActiveDownload != null && (ActiveDownload.Status == "downloading" || ActiveDownload.Status == "queued");
        [JsonIgnore] public bool IsInstalling => ActiveInstall != null && (ActiveInstall.Status == "installing" || ActiveInstall.Status == "pending");

        private bool _isSelected;
        [JsonIgnore]
        public bool IsSelected
        {
            get => _isSelected;
            set { SetProperty(ref _isSelected, value); OnPropertyChanged(nameof(IsSelected)); }
        }

        [JsonIgnore]
        public string SourceNames
        {
            get
            {
                if (Repacks == null || Repacks.Count == 0) return "Unknown";
                return string.Join(", ", Repacks.Select(r => r.Source?.Title ?? r.SourceName).Where(s => s != null).Distinct());
            }
        }
    }

    public class GameMedia
    {
        [JsonProperty("id")] public string Id { get; set; }
        [JsonProperty("url")] public string Url { get; set; }
        [JsonProperty("video_id")] public string VideoId { get; set; }
    }

    public class GameReleaseDate
    {
        [JsonProperty("release_date")] public long? ReleaseDateUnix { get; set; }
        [JsonProperty("release_year")] public int? ReleaseYear { get; set; }
        [JsonProperty("region_name")] public string RegionName { get; set; }
    }
}