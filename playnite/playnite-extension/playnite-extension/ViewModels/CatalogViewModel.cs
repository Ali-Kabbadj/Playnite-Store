using GamesNexus.App;
using GamesNexus.Core;
using GamesNexus.Models;
using GamesNexus.Services;
using Playnite.SDK;
using Playnite.SDK.Models;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Input;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Game = GamesNexus.Models.Game;
using RelayCommand = GamesNexus.Core.RelayCommand;

namespace GamesNexus.ViewModels
{
    public class CatalogViewModel : ViewModelBase
    {
        private bool _isStoreOpen;
        public bool IsStoreOpen
        {
            get => _isStoreOpen;
            set
            {
                if (SetProperty(ref _isStoreOpen, value) && value)
                {
                    if (Games.Count == 0)
                        _ = LoadGamesAsync(true);
                    _ = LoadGenresAsync();
                    _ = LoadSourcesAsync();
                    _ = LoadPlatformsAsync();
                    _dispatcher.BeginInvoke(
                        new Action(() => ThemeIntegrationService.WireStoreView()),
                        System.Windows.Threading.DispatcherPriority.Loaded);
                }
            }
        }

        public ICommand ToggleStoreCommand { get; }
        public ICommand StartDownloadCommand { get; }

        public ObservableCollection<Game> Games { get; } = new ObservableCollection<Game>();

        private Game _selectedGame;
        public Game SelectedGame
        {
            get => _selectedGame;
            set
            {
                if (SetProperty(ref _selectedGame, value))
                {
                    IsSidebarOpen = value != null;
                    GameSelected?.Invoke(value);

                    // Clear stale visuals immediately so the UI shows empty/black until new data loads
                    _currentHeroImage = null;
                    OnPropertyChanged(nameof(CurrentHeroImage));

                    // Notify screenshot-dependent properties
                    OnPropertyChanged(nameof(HasScreenshots));
                    OnPropertyChanged(nameof(ScreenshotCount));
                    OnPropertyChanged(nameof(CurrentScreenshotUrl));
                    OnPropertyChanged(nameof(CurrentScreenshotDisplay));

                    if (value != null)
                    {
                        // Clear previous game's loaded images so old logos/covers don't linger
                        // (the async fetch below will re-populate them)
                        value.LogoImageBitmap = null;
                        value.HeroImageBitmap = null;
                        _ = FetchFullGameAndHeroAsync(value);
                    }
                }
            }
        }

        private async Task FetchFullGameAndHeroAsync(Game game)
        {
            try
            {
                var api = GamesNexusContext.Api;
                if (api == null) { Debug.WriteLine("[GN] FetchFullGameAndHeroAsync: api is null"); return; }
                Game targetGame = game;
                Debug.WriteLine($"[GN] FetchFullGameAndHeroAsync: game={game.Id}, artworks={(game.Artworks?.Count.ToString() ?? "null")}, devs={(game.Developers?.Count.ToString() ?? "null")}, coverUrl={game.CoverUrl}");

                // 1. Fetch full game details if missing Artworks/Devs
                if (game.Artworks == null || game.Developers == null)
                {
                    Debug.WriteLine("[GN] FetchFullGameAndHeroAsync: fetching full game details");
                    var fullGame = await api.GetGameByIdAsync(game.Id);
                    Debug.WriteLine($"[GN] FetchFullGameAndHeroAsync: fullGame={(fullGame == null ? "null" : "ok")}, fullGame.Artworks={(fullGame?.Artworks?.Count.ToString() ?? "null")}");
                    if (fullGame != null)
                    {
                        await _dispatcher.InvokeAsync(() =>
                        {
                            int idx = Games.IndexOf(game);
                            if (idx >= 0)
                            {
                                var existing = Games[idx];
                                existing.Artworks = fullGame.Artworks;
                                existing.Screenshots = fullGame.Screenshots;
                                existing.Videos = fullGame.Videos;
                                OnPropertyChanged(nameof(HasScreenshots));
                                OnPropertyChanged(nameof(ScreenshotCount));
                                OnPropertyChanged(nameof(HasVideos));
                                existing.Developers = fullGame.Developers;
                                existing.Publishers = fullGame.Publishers;
                                existing.Summary = fullGame.Summary;
                                existing.LogoUrl = fullGame.LogoUrl;
                                _selectedGame = existing;
                                targetGame = existing;
                                Debug.WriteLine($"[GN] FetchFullGameAndHeroAsync: updated existing game, artworks now={(existing.Artworks?.Count.ToString() ?? "null")}");
                            }
                            else
                            {
                                _selectedGame = fullGame;
                                targetGame = fullGame;
                                Debug.WriteLine("[GN] FetchFullGameAndHeroAsync: game not in list, using fullGame directly");
                            }
                            OnPropertyChanged(nameof(SelectedGame));
                        });
                    }
                }

                // 2. Fetch Logo
                if (!string.IsNullOrEmpty(targetGame.LogoUrl))
                {
                    Debug.WriteLine($"[GN] FetchFullGameAndHeroAsync: fetching logo from {targetGame.LogoUrl}");
                    var logoBmp = await api.GetCachedImageAsync(targetGame.LogoUrl, 600);
                    Debug.WriteLine($"[GN] FetchFullGameAndHeroAsync: logo result={(logoBmp == null ? "null" : "ok")}");
                    if (logoBmp != null)
                    {
                        var trimmed = api.TrimTransparentEdges(logoBmp);
                        await _dispatcher.InvokeAsync(() => targetGame.LogoImageBitmap = trimmed ?? logoBmp);
                    }
                }
                else
                {
                    Debug.WriteLine("[GN] FetchFullGameAndHeroAsync: no logo URL");
                }

                // 3. Resolve WIDESCREEN Background (Artworks > Screenshots > Cover fallback)
                string heroUrl = null;
                if (targetGame.Artworks != null && targetGame.Artworks.Count > 0)
                    heroUrl = targetGame.Artworks.FirstOrDefault(a => a.Url != null)?.Url;

                if (string.IsNullOrEmpty(heroUrl) && targetGame.Screenshots != null && targetGame.Screenshots.Count > 0)
                    heroUrl = targetGame.Screenshots.FirstOrDefault(s => s.Url != null)?.Url;

                if (string.IsNullOrEmpty(heroUrl) && !string.IsNullOrEmpty(targetGame.CoverUrl))
                    heroUrl = targetGame.CoverUrl;

                Debug.WriteLine($"[GN] FetchFullGameAndHeroAsync: heroUrl resolved to='{heroUrl}' (artworksCount={targetGame.Artworks?.Count}, screenshotsCount={targetGame.Screenshots?.Count}, coverUrl={targetGame.CoverUrl})");

                if (!string.IsNullOrEmpty(heroUrl))
                {
                    heroUrl = heroUrl.Replace("t_thumb", "t_1080p")
                                     .Replace("t_cover_big", "t_1080p")
                                     .Replace("t_screenshot_med", "t_1080p")
                                     .Replace("t_720p", "t_1080p");
                    Debug.WriteLine($"[GN] FetchFullGameAndHeroAsync: fetching hero from {heroUrl}");

                    var bmp = await api.GetCachedImageAsync(heroUrl, 1920);
                    Debug.WriteLine($"[GN] FetchFullGameAndHeroAsync: hero image result={(bmp == null ? "null" : "ok")}");
                    if (bmp != null)
                    {
                        var cachePath = api.GetImageCachePath(heroUrl, 1920);
                        Debug.WriteLine($"[GN] FetchFullGameAndHeroAsync: hero cache path={cachePath ?? "null"}, exists={File.Exists(cachePath)}");
                        await _dispatcher.InvokeAsync(() =>
                        {
                            targetGame.HeroImageBitmap = bmp;
                            CurrentHeroImage = cachePath;
                        });
                    }
                }
                else
                {
                    Debug.WriteLine("[GN] FetchFullGameAndHeroAsync: no hero URL to fetch");
                }

                // 6. Resolve trailer URL (if game has videos)
                if (targetGame.Videos?.Count > 0)
                {
                    _ = ResolveTrailerUrlAsync(targetGame);
                }
                else
                {
                    _resolvedTrailerUrls.Remove(targetGame.Id);
                    await _dispatcher.InvokeAsync(() => {
                        if (SelectedGame?.Id == targetGame.Id) ResolvedTrailerUrl = null;
                    });
                }
            }
            catch (Exception ex) { Debug.WriteLine($"[GN] FetchFullGameAndHeroAsync ERROR: {ex.Message}"); }
        }

        //  Screenshot Viewer State
        private bool _isScreenshotViewerOpen;
        public bool IsScreenshotViewerOpen
        {
            get => _isScreenshotViewerOpen;
            set => SetProperty(ref _isScreenshotViewerOpen, value);
        }

        private int _currentScreenshotIndex;
        public int CurrentScreenshotIndex
        {
            get => _currentScreenshotIndex;
            set
            {
                if (SetProperty(ref _currentScreenshotIndex, value))
                {
                    OnPropertyChanged(nameof(CurrentScreenshotUrl));
                    OnPropertyChanged(nameof(CurrentScreenshotDisplay));
                    OnPropertyChanged(nameof(HasPreviousScreenshot));
                    OnPropertyChanged(nameof(HasNextScreenshot));
                }
            }
        }

        public string CurrentScreenshotUrl
        {
            get
            {
                if (SelectedGame?.Screenshots == null || CurrentScreenshotIndex < 0 || CurrentScreenshotIndex >= SelectedGame.Screenshots.Count)
                    return null;
                return SelectedGame.Screenshots[CurrentScreenshotIndex].Url;
            }
        }
        public bool HasScreenshots => SelectedGame?.Screenshots != null && SelectedGame.Screenshots.Count > 0;
        public int ScreenshotCount => SelectedGame?.Screenshots?.Count ?? 0;
        public string CurrentScreenshotDisplay => ScreenshotCount > 0 ? $"{CurrentScreenshotIndex + 1} / {ScreenshotCount}" : "";
        public bool HasPreviousScreenshot => ScreenshotCount > 1;
        public bool HasNextScreenshot => ScreenshotCount > 1;

        //  Trailer / Video State
        public bool HasVideos => SelectedGame?.Videos != null && SelectedGame.Videos.Count > 0;

        private static readonly Dictionary<string, string> _resolvedTrailerUrls = new Dictionary<string, string>();

        private Uri _resolvedTrailerUrl;
        public Uri ResolvedTrailerUrl
        {
            get => _resolvedTrailerUrl;
            set
            {
                if (SetProperty(ref _resolvedTrailerUrl, value))
                    OnPropertyChanged(nameof(HasResolvedTrailer));
            }
        }

        public bool HasResolvedTrailer => ResolvedTrailerUrl != null;

        private async Task ResolveTrailerUrlAsync(Game game)
        {
            string gameId = game.Id;
            if (_resolvedTrailerUrls.TryGetValue(gameId, out var cachedUrl))
            {
                await _dispatcher.InvokeAsync(() => {
                        if (SelectedGame?.Id == gameId) ResolvedTrailerUrl = new Uri(cachedUrl);
                });
                return;
            }

            var vid = game.Videos?[0];
            string ytId = vid?.VideoId;
            if (string.IsNullOrEmpty(ytId))
            {
                string directUrl = vid?.Url ?? "";
                _resolvedTrailerUrls[gameId] = directUrl;
                await _dispatcher.InvokeAsync(() => {
                        if (SelectedGame?.Id == gameId) ResolvedTrailerUrl = new Uri(directUrl);
                });
                return;
            }

            try
            {
                // Resolve trailer URL by downloading the video to a local cache file using yt-dlp
                string cacheFolder = Path.Combine(Path.GetTempPath(), "GamesNexus_Trailers");
                try
                {
                    if (!Directory.Exists(cacheFolder))
                        Directory.CreateDirectory(cacheFolder);
                }
                catch (Exception dirEx)
                {
                    Debug.WriteLine($"[GN] Failed to ensure trailer cache folder: {dirEx.Message}");
                }

                // Build cache file path based on game ID and YouTube ID to avoid collisions
                string cacheFile = Path.Combine(cacheFolder, $"{gameId}_{ytId}.mp4");

                // If we already have a cached file, use it
                if (File.Exists(cacheFile))
                {
                    _resolvedTrailerUrls[gameId] = cacheFile;
                    await _dispatcher.InvokeAsync(() => {
                                if (SelectedGame?.Id == gameId) ResolvedTrailerUrl = new Uri(cacheFile);
                    });
                }
                else
                {
                    // Download using yt-dlp
                    var psi = new ProcessStartInfo
                    {
                        FileName = "yt-dlp",
                        Arguments = $"-f best[ext=mp4] -o \"{cacheFile}\" \"https://www.youtube.com/watch?v={ytId}\"",
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    Process proc = null;
                    try
                    {
                        proc = Process.Start(psi);
                        if (proc != null)
                        {
                            string stdOut = proc.StandardOutput.ReadToEnd();
                            string stdErr = proc.StandardError.ReadToEnd();
                            proc.WaitForExit();
                            if (proc.ExitCode != 0)
                            {
                                Debug.WriteLine($"[GN] yt-dlp download failed for {ytId}: {stdErr}");
                            }
                        }
                        else
                        {
                            Debug.WriteLine("[GN] yt-dlp process failed to start");
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[GN] yt-dlp exception for {ytId}: {ex.Message}");
                    }

                    // After download attempt, check if file exists
                    if (File.Exists(cacheFile))
                    {
                        _resolvedTrailerUrls[gameId] = cacheFile;
                        await _dispatcher.InvokeAsync(() => {
                        if (SelectedGame?.Id == gameId) ResolvedTrailerUrl = new Uri(cacheFile);
                        });
                    }
                    else
                    {
                        // Fallback: no video
                        _resolvedTrailerUrls[gameId] = "";
                        await _dispatcher.InvokeAsync(() => {
                            if (SelectedGame?.Id == gameId) ResolvedTrailerUrl = null;
                        });
                    }
                }

            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[GN] yt-dlp resolve error: {ex.Message}");
                _resolvedTrailerUrls[gameId] = "";
                await _dispatcher.InvokeAsync(() => {
                    if (SelectedGame?.Id == gameId) ResolvedTrailerUrl = null;
                });
            }
        }

        public event Action<Game> GameSelected;

        private bool _isSidebarOpen;
        public bool IsSidebarOpen
        {
            get => _isSidebarOpen;
            set => SetProperty(ref _isSidebarOpen, value);
        }

        private bool _isLoading;
        public bool IsLoading
        {
            get => _isLoading;
            set => SetProperty(ref _isLoading, value);
        }

        private string _statusText = "Ready";
        public string StatusText
        {
            get => _statusText;
            set => SetProperty(ref _statusText, value);
        }

        private string _statusTextTotal = "Ready";
        public string StatusTotalText
        {
            get => _statusTextTotal;
            set => SetProperty(ref _statusTextTotal, value);
        }

        private int _totalCount;
        public int TotalCount
        {
            get => _totalCount;
            set => SetProperty(ref _totalCount, value);
        }

        private bool _hasMore = true;
        public bool HasMore
        {
            get => _hasMore;
            set => SetProperty(ref _hasMore, value);
        }

        private string _currentHeroImage;
        public string CurrentHeroImage
        {
            get => _currentHeroImage;
            set => SetProperty(ref _currentHeroImage, value);
        }

        private string _searchText = "";
        public string SearchText
        {
            get => _searchText;
            set
            {
                if (SetProperty(ref _searchText, value))
                    _ = LoadGamesAsync(true);
            }
        }

        public ICommand SelectGameCommand { get; }
        public ICommand CloseSidebarCommand { get; }
        public ICommand LoadNextPageCommand { get; }
        public ICommand SelectGameByIdCommand { get; }
        public ICommand DownloadRepackCommand { get; }
        public ICommand FilterByGenreCommand { get; }
        public ICommand FilterBySourceCommand { get; }
        public ICommand FilterByPlatformCommand { get; }
        public ICommand SortByCommand { get; }
        public ICommand SearchCommand { get; }
        public ICommand OpenScreenshotViewerCommand { get; }
        public ICommand CloseScreenshotViewerCommand { get; }
        public ICommand NextScreenshotCommand { get; }
        public ICommand PreviousScreenshotCommand { get; }

        private int _currentPage = 1;
        private readonly int _pageSize = 20;
        private CancellationTokenSource _cts;
        private CancellationTokenSource _coverCts;

        public string CurrentSortBy { get; set; } = "Release";
        public bool CurrentSortDesc { get; set; } = true;
        public HashSet<string> SelectedGenres { get; } = new HashSet<string>();
        private string _currentGenre = "";
        public string CurrentGenre
        {
            get => _currentGenre;
            set
            {
                if (SetProperty(ref _currentGenre, value))
                    OnPropertyChanged(nameof(CurrentGenreLabel));
            }
        }
        private string _currentSource = "";
        public string CurrentSource
        {
            get => _currentSource;
            set
            {
                if (SetProperty(ref _currentSource, value))
                    OnPropertyChanged(nameof(CurrentSourceLabel));
            }
        }
        private string _currentPlatform = "";
        public string CurrentPlatform
        {
            get => _currentPlatform;
            set
            {
                if (SetProperty(ref _currentPlatform, value))
                    OnPropertyChanged(nameof(CurrentPlatformLabel));
            }
        }
        public bool CurrentHasRepacks { get; set; } = true;

        public string CurrentGenreLabel => string.IsNullOrEmpty(CurrentGenre) ? "All Genres" : CurrentGenre;
        public string CurrentSourceLabel => string.IsNullOrEmpty(CurrentSource) ? "All Repackers" : CurrentSource;
        public string CurrentPlatformLabel => string.IsNullOrEmpty(CurrentPlatform) ? "All Platforms" : CurrentPlatform;

        public List<string> AllGenreNames { get; private set; } = new List<string>();
        public bool GenresLoaded { get; private set; }

        public List<FilterOption> Sources { get; private set; } = new List<FilterOption>();
        public List<FilterOption> Platforms { get; private set; } = new List<FilterOption>();
        public List<FilterOption> Publishers { get; private set; } = new List<FilterOption>();
        public List<FilterOption> Stores { get; private set; } = new List<FilterOption>();

        public bool IgnoreFilterChanges { get; set; } = true;
        private const int CoverBatchSize = 5;

        public List<Download> AllDownloads { get; } = new List<Download>();
        public List<InstallTask> AllInstalls { get; } = new List<InstallTask>();
        private readonly Dispatcher _dispatcher;

        public CatalogViewModel()
        {
            _dispatcher = Dispatcher.CurrentDispatcher;
            SelectGameCommand = new RelayCommand(g => SelectedGame = g as Game);
            CloseSidebarCommand = new RelayCommand(_ => SelectedGame = null);
            LoadNextPageCommand = new RelayCommand(_ => _ = LoadGamesAsync(false), _ => !IsLoading && _hasMore);

            ToggleStoreCommand = new RelayCommand(_ =>
            {
                IsStoreOpen = !IsStoreOpen;
                if (IsStoreOpen && Games.Count == 0)
                    _ = LoadGamesAsync(true);
            });

            SelectGameByIdCommand = new RelayCommand(id =>
            {
                if (id is string gameId)
                {
                    var game = Games.FirstOrDefault(g => g.Id == gameId);
                    if (game != null) SelectedGame = game;
                }
            });

            DownloadRepackCommand = new RelayCommand(p =>
            {
                if (p is Game selGame)
                    SelectedGame = selGame;
                else if (p is string gameId)
                {
                    var found = Games.FirstOrDefault(g => g.Id == gameId);
                    if (found != null) SelectedGame = found;
                }
            });

            StartDownloadCommand = new RelayCommand(async p =>
            {
                var game = p as Game ?? SelectedGame;
                if (game == null || game.Repacks == null || game.Repacks.Count == 0) return;
                var repack = game.Repacks.OrderByDescending(r => r.UploadDate).FirstOrDefault();
                var magnet = repack?.Uris?.FirstOrDefault(u => u.StartsWith("magnet:"));
                if (magnet != null)
                {
                    await GamesNexusContext.DownloadManager.StartDownloadAsync(game, repack, magnet);
                }
            });

            FilterByGenreCommand = new RelayCommand(p =>
            {
                var val = p as string ?? "";
                CurrentGenre = (val == "All Genres") ? "" : val;
                _ = LoadGamesAsync(true);
            });

            FilterBySourceCommand = new RelayCommand(p =>
            {
                CurrentSource = p as string ?? "";
                _ = LoadGamesAsync(true);
            });

            FilterByPlatformCommand = new RelayCommand(p =>
            {
                CurrentPlatform = p as string ?? "";
                _ = LoadGamesAsync(true);
            });

            SortByCommand = new RelayCommand(p =>
            {
                if (p is string sortExpr)
                {
                    var parts = sortExpr.Split(',');
                    if (parts.Length >= 1) CurrentSortBy = parts[0];
                    if (parts.Length >= 2) CurrentSortDesc = parts[1].Trim() == "desc";
                    _ = LoadGamesAsync(true);
                }
            });

            SearchCommand = new RelayCommand(p =>
            {
                SearchText = p as string ?? "";
            });

            OpenScreenshotViewerCommand = new RelayCommand(param =>
            {
                if (param is GameMedia media && SelectedGame?.Screenshots != null)
                {
                    var idx = SelectedGame.Screenshots.IndexOf(media);
                    if (idx >= 0) CurrentScreenshotIndex = idx;
                }
                IsScreenshotViewerOpen = true;
            }, _ => HasScreenshots);

            CloseScreenshotViewerCommand = new RelayCommand(_ => IsScreenshotViewerOpen = false);

            NextScreenshotCommand = new RelayCommand(_ =>
            {
                if (ScreenshotCount == 0) return;
                if (CurrentScreenshotIndex >= ScreenshotCount - 1)
                    CurrentScreenshotIndex = 0;
                else
                    CurrentScreenshotIndex++;
            });

            PreviousScreenshotCommand = new RelayCommand(_ =>
            {
                if (ScreenshotCount == 0) return;
                if (CurrentScreenshotIndex <= 0)
                    CurrentScreenshotIndex = ScreenshotCount - 1;
                else
                    CurrentScreenshotIndex--;
            });


        }

        public async Task LoadGamesAsync(bool reset = true)
        {
            if (!reset && IsLoading) return;
            var source = string.IsNullOrEmpty(CurrentSource) ? null : CurrentSource;
            var platform = string.IsNullOrEmpty(CurrentPlatform) ? null : CurrentPlatform;

            _cts?.Cancel();
            _cts = new CancellationTokenSource();
            var token = _cts.Token;

            if (reset)
            {
                _currentPage = 1;
                HasMore = true;
                var _ = _dispatcher.InvokeAsync(() => Games.Clear());
            }

            IsLoading = true;
            StatusText = "...";

            try
            {
                var api = GamesNexusContext.Api;
                if (api == null) return;

                var search = string.IsNullOrWhiteSpace(SearchText) ? null : SearchText;
                var genre = string.IsNullOrEmpty(CurrentGenre) ? null : CurrentGenre;
                var sort = "date_desc";

                if (CurrentSortBy == "Name") sort = CurrentSortDesc ? "title_desc" : "title_asc";
                else if (CurrentSortBy == "Release") sort = CurrentSortDesc ? "date_desc" : "date_asc";
                else if (CurrentSortBy == "Upload") sort = CurrentSortDesc ? "upload_desc" : "upload_asc";

                var (results, totalCount) = await api.GetGamesAsync(_currentPage, _pageSize, source, search, genre, sort, platform, CurrentHasRepacks);

                if (token.IsCancellationRequested) return;

                await _dispatcher.InvokeAsync(() =>
                {
                    if (token.IsCancellationRequested) return;
                    if (reset) Games.Clear();

                    foreach (var g in results)
                        Games.Add(g);

                    HasMore = results.Count >= _pageSize;
                    TotalCount = totalCount;
                    MergeGameState();
                    StatusText = $"{Games.Count}";
                    StatusTotalText = $"/ {totalCount} games";

                    // Auto-select first game on fresh load so UI triggers fire
                    if (_selectedGame == null && Games.Count > 0)
                        SelectedGame = Games[0];
                });

                if (!token.IsCancellationRequested && results.Count > 0)
                {
                    _coverCts?.Cancel();
                    _coverCts = new CancellationTokenSource();
                    _ = LoadCoversAsync(results, _coverCts.Token);
                }
            }
            catch (Exception)
            {
                if (!token.IsCancellationRequested)
                    StatusText = "Error loading games";
            }
            finally
            {
                if (!token.IsCancellationRequested)
                    IsLoading = false;
            }
        }

        public async Task LoadNextPage()
        {
            if (!HasMore || IsLoading) return;
            _currentPage++;
            await LoadGamesAsync(false);
        }

        public async Task LoadGenresAsync()
        {
            if (GenresLoaded) return;
            try
            {
                var api = GamesNexusContext.Api;
                if (api == null) return;
                var genres = await api.GetGenresAsync();
                var list = genres?.Select(g => g.Name).ToList() ?? new List<string>();
                list.Insert(0, "All Genres");
                AllGenreNames = list;
                GenresLoaded = true;
            }
            catch { }
        }

        public async Task LoadHeroImageAsync(Game game)
        {
            try
            {
                var api = GamesNexusContext.Api;
                if (api == null) return;

                // Fetch full game details to get Artworks, Screenshots, and our future Logo
                if (game.Artworks == null && game.Screenshots == null)
                {
                    var fullGame = await api.GetGameByIdAsync(game.Id);
                    if (fullGame != null)
                    {
                        game.Artworks = fullGame.Artworks;
                        game.Screenshots = fullGame.Screenshots;
                        game.Summary = fullGame.Summary;
                        game.LogoUrl = fullGame.LogoUrl; // Receives logo from backend
                    }
                }

                // 1. Load High-Quality Logo
                if (!string.IsNullOrEmpty(game.LogoUrl))
                {
                    string logoUrl = game.LogoUrl.Replace("t_thumb", "t_1080p");
                    var logoBmp = await api.GetCachedImageAsync(logoUrl, 600);
                    if (logoBmp != null)
                        game.LogoImageBitmap = logoBmp;
                }

                // 2. Load High-Quality Background Image
                string heroUrl = null;
                if (game.Artworks != null && game.Artworks.Count > 0)
                    heroUrl = game.Artworks[0].Url;
                else if (game.Screenshots != null && game.Screenshots.Count > 0)
                    heroUrl = game.Screenshots[0].Url;
                else if (!string.IsNullOrEmpty(game.CoverUrl))
                    heroUrl = game.CoverUrl;

                if (heroUrl != null)
                {
                    // Force IGDB to give us 1080p instead of the tiny thumb
                    heroUrl = heroUrl.Replace("t_thumb", "t_1080p").Replace("t_cover_big", "t_1080p");
                    var bmp = await api.GetCachedImageAsync(heroUrl, 1920);
                    if (bmp != null)
                        game.HeroImageBitmap = bmp;
                }
            }
            catch { }
        }

        public async Task LoadSourcesAsync()
        {
            try
            {
                var api = GamesNexusContext.Api;
                if (api == null) return;
                var sources = await api.GetSourcesAsync();
                var list = sources ?? new List<FilterOption>();
                list.Insert(0, new FilterOption { Id = "", Name = "All Repackers" });
                Sources = list;
            }
            catch { }
        }

        public async Task LoadPlatformsAsync()
        {
            try
            {
                var api = GamesNexusContext.Api;
                if (api == null) return;
                var platforms = await api.GetPlatformsAsync();
                var list = platforms ?? new List<FilterOption>();
                list.Insert(0, new FilterOption { Id = "", Name = "All Platforms" });
                Platforms = list;
            }
            catch { }
        }

        private async Task LoadCoversAsync(List<Game> games, CancellationToken ct)
        {
            for (int i = 0; i < games.Count; i += CoverBatchSize)
            {
                if (ct.IsCancellationRequested) return;
                var chunk = games.Skip(i).Take(CoverBatchSize);
                await Task.WhenAll(chunk.Select(g => LoadCoverAsync(g, ct)));
            }
        }

        private async Task LoadCoverAsync(Game game, CancellationToken ct)
        {
            if (string.IsNullOrEmpty(game.CoverUrl)) return;
            if (ct.IsCancellationRequested) return;
            try
            {
                var api = GamesNexusContext.Api;
                if (api == null) return;
                var bmp = await api.GetCachedImageAsync(game.CoverUrl, 300);
                if (ct.IsCancellationRequested) return;
                if (bmp != null)
                {
                    await _dispatcher.InvokeAsync(() => game.CoverImageBitmap = bmp);
                }
            }
            catch { }
        }

        public void MergeGameState()
        {
            var dlMap = AllDownloads.Where(d => d.Status == "downloading" || d.Status == "queued").ToLookup(d => d.GameId);
            var installMap = AllInstalls.Where(i => i.Status == "installing" || i.Status == "pending").ToLookup(i => i.GameId);

            foreach (var game in Games)
            {
                game.ActiveDownload = dlMap[game.Id]?.FirstOrDefault();
                game.ActiveInstall = installMap[game.Id]?.FirstOrDefault();
            }
        }

        public void Stop()
        {
            _coverCts?.Cancel();
            _coverCts = null;
            _cts?.Cancel();
            _cts = null;
            GamesNexusContext.Api?.CancelPendingRequests();
        }
    }
}