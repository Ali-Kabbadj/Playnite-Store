using GamesNexus.App;
using GamesNexus.Core;
using GamesNexus.Models;
using Playnite.SDK;
using Playnite.SDK.Models;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Input;
using System.Windows.Threading;
using Game = GamesNexus.Models.Game;
using RelayCommand = GamesNexus.Core.RelayCommand;

namespace GamesNexus.ViewModels
{
    public class CatalogViewModel : ViewModelBase
    {
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
                }
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

        private int _currentPage = 1;
        private readonly int _pageSize = 20;
        private bool _hasMore = true;
        private CancellationTokenSource _cts;
        private CancellationTokenSource _coverCts;

        public string CurrentSortBy { get; set; } = "Release";
        public bool CurrentSortDesc { get; set; } = true;
        public HashSet<string> SelectedGenres { get; } = new HashSet<string>();
        public string CurrentSource { get; set; } = "";
        public string CurrentPlatform { get; set; } = "";
        public bool CurrentHasRepacks { get; set; } = true;

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
                _hasMore = true;
                var _ = _dispatcher.InvokeAsync(() => Games.Clear());
            }

            IsLoading = true;
            StatusText = "...";

            try
            {
                var api = GamesNexusContext.Api;
                if (api == null) return;

                var search = string.IsNullOrWhiteSpace(SearchText) ? null : SearchText;
                var genre = SelectedGenres.Count > 0 ? string.Join(",", SelectedGenres) : null;
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

                    _hasMore = results.Count >= _pageSize;
                    MergeGameState();
                    StatusText = $"{Games.Count}";
                    StatusTotalText = $"/ {totalCount} games";
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
            if (!_hasMore || IsLoading) return;
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
                AllGenreNames = genres?.Select(g => g.Name).ToList() ?? new List<string>();
                GenresLoaded = true;
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