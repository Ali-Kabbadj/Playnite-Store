using Newtonsoft.Json;
using System.Collections.Generic;
using System.Linq;
using System.Windows.Media.Imaging;
using GamesNexus.Core;

namespace GamesNexus.Models
{
    public class RepackUri
    {
        [JsonProperty("id")] public int Id { get; set; }
        [JsonProperty("uri")] public string Uri { get; set; }
        [JsonProperty("type")] public string Type { get; set; }
    }

    public class RepackSource
    {
        [JsonProperty("id")] public int Id { get; set; }
        [JsonProperty("title")] public string Title { get; set; }
    }

    public class Repack : ViewModelBase
    {
        [JsonProperty("id")] public string Id { get; set; }
        [JsonProperty("title")] public string Title { get; set; }
        [JsonProperty("file_size")] public string FileSize { get; set; }
        [JsonProperty("upload_date")] public string UploadDate { get; set; }

        [JsonProperty("source_name")] public string SourceName { get; set; } 
        [JsonProperty("source")] public RepackSource Source { get; set; } 
        [JsonProperty("uris")] public List<RepackUri> UrisList { get; set; }
        [JsonProperty("uris_simple")] public List<string> UrisSimple { get; set; } 

        [JsonIgnore]
        public List<string> Uris => UrisSimple ?? UrisList?.Select(u => u.Uri).ToList() ?? new List<string>();

        public bool HasMagnet => Uris?.Any(u => u.StartsWith("magnet:")) ?? false;

        private BitmapImage _iconBitmap;
        [JsonIgnore]
        public BitmapImage IconBitmap
        {
            get => _iconBitmap;
            set => SetProperty(ref _iconBitmap, value);
        }
    }
}