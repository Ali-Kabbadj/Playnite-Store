using Newtonsoft.Json;
using System.Collections.Generic;

namespace GamesNexus.Models
{
    public class PaginatedResponse<T>
    {
        [JsonProperty("data")] public List<T> Data { get; set; }
        [JsonProperty("total")] public int Total { get; set; }
        [JsonProperty("page")] public int Page { get; set; }
        [JsonProperty("limit")] public int Limit { get; set; }
    }

    public class FilterOption
    {
        [JsonProperty("id")] public string Id { get; set; }
        [JsonProperty("name")] public string Name { get; set; }
        [JsonProperty("logo_url")] public string Icon { get; set; }
    }

    public class GamesNexusAppSettings
    {
        public string ApiUrl { get; set; }= "http://127.0.0.1:3456";
        public string InstallDir { get; set; }
        public bool AskDownloadDestination { get; set; } = true;
        public string CacheDestination { get; set; }
        public bool AutoOpenMagnet { get; set; } = true;
        public float MaxCacheGb { get; set; } = 50;
        public int PollIntervalMs { get; set; } = 5000;
        public string DownloadDir { get; set; }
    }
}