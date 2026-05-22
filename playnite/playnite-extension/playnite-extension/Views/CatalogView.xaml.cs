using GamesNexus.App;
using GamesNexus.Models;
using GamesNexus.Services;
using GamesNexus.ViewModels;
using Playnite.SDK;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;

namespace GamesNexus.Views
{
    public partial class CatalogView : UserControl
    {
        public class FilterCheckItem : INotifyPropertyChanged
        {
            public event PropertyChangedEventHandler PropertyChanged;
            public string Label { get; set; }
            private bool _isChecked;
            public bool IsChecked
            {
                get => _isChecked;
                set { _isChecked = value; PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(IsChecked))); }
            }
        }

        private static readonly ILogger logger = LogManager.GetLogger();
        private CatalogViewModel Catalog => (DataContext as MainViewModel)?.CatalogVM;
        private MainViewModel VM => DataContext as MainViewModel;

        private ObservableCollection<Game> GamesSource => Catalog?.Games;
        private readonly DispatcherTimer _searchTimer;
        private string _currentSearch = "";
        private readonly HashSet<string> _selectedGenres = new HashSet<string>();
        private List<string> _allGenreNames = new List<string>();
        private bool _genresLoaded;
        private bool _ignoreFilterChanges = true;
        private double _cardZoom = 1.0;

        public static readonly DependencyProperty GridColumnsProperty = DependencyProperty.Register(nameof(GridColumns), typeof(int), typeof(CatalogView), new PropertyMetadata(4));
        public int GridColumns
        {
            get => (int)GetValue(GridColumnsProperty);
            set => SetValue(GridColumnsProperty, value);
        }

        public static readonly DependencyProperty CardHeightProperty = DependencyProperty.Register(nameof(CardHeight), typeof(double), typeof(CatalogView), new PropertyMetadata(310.0));
        public double CardHeight
        {
            get => (double)GetValue(CardHeightProperty);
            set => SetValue(CardHeightProperty, value);
        }

        public static readonly DependencyProperty CardMarginProperty = DependencyProperty.Register(nameof(CardMargin), typeof(Thickness), typeof(CatalogView), new PropertyMetadata(new Thickness(8)));
        public Thickness CardMargin
        {
            get => (Thickness)GetValue(CardMarginProperty);
            set => SetValue(CardMarginProperty, value);
        }

        private readonly double _catalogStarWidth = 65;
        private readonly double _sidebarStarWidth = 35;
        public event Action<BitmapSource> HeroImageChanged;
        public event Action<List<string>, int> ScreenshotClicked;

        public CatalogView()
        {
            InitializeComponent();

            SidebarCtrl.HeroImageChanged += (bmp) => HeroImageChanged?.Invoke(bmp);
            SidebarCtrl.ScreenshotClicked += (urls, idx) => ScreenshotClicked?.Invoke(urls, idx);

            _searchTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(300) };
            _searchTimer.Tick += (s, e) =>
            {
                _searchTimer.Stop();
                _currentSearch = SearchBox.Text.Trim();
                if (Catalog != null) Catalog.SearchText = _currentSearch;
                _ = LoadGamesAsync(true);
            };

            GamesScrollViewer.SizeChanged += (s, e) => UpdateGameGrid();
            GamesScrollViewer.PreviewMouseWheel += (s, e) =>
            {
                e.Handled = true;
                double speed = 3.0 * _cardZoom;
                double pixels = (e.Delta / 120.0) * speed * 40;
                GamesScrollViewer.ScrollToVerticalOffset(GamesScrollViewer.VerticalOffset - pixels);
            };

            Loaded += (s, e) => UpdateGameGrid();
            _ignoreFilterChanges = false;


        }

        public async Task LoadGamesAsync(bool reset = true, string search = null)
        {
            var vm = Catalog;
            if (vm == null) return;
            if (!string.IsNullOrEmpty(search)) vm.SearchText = search;

            if (GamesList.ItemsSource != vm.Games)
                GamesList.ItemsSource = vm.Games;

            await vm.LoadGamesAsync(reset);
            await Dispatcher.InvokeAsync(() =>
            {
                VM?.MergeGameState(vm.Games);
            });
        }

        public void RefreshGameState()
        {
            var vm = Catalog;
            if (VM != null && vm != null) VM.MergeGameState(vm.Games);
        }

        #region Genre Filter
        private async Task PopulateGenresAsync()
        {
            if (_genresLoaded) return;
            _genresLoaded = true;
            var vm = Catalog;
            if (vm == null) return;
            await vm.LoadGenresAsync();
            _allGenreNames = vm.AllGenreNames ?? new List<string>();
            if (_allGenreNames.Count == 0) return;

            await Dispatcher.InvokeAsync(() =>
            {
                GenreSearchBox.Text = "";
                ReloadGenreCheckboxes("");
            });
        }

        private void ReloadGenreCheckboxes(string filter)
        {
            GenreFilterList.Items.Clear();
            var allItem = new CheckBox
            {
                Content = "All Genres",
                IsChecked = _selectedGenres.Count == 0,
                Tag = "__all__",
                Margin = new Thickness(4),
                Foreground = new SolidColorBrush(Color.FromArgb(0xCC, 0xFF, 0xFF, 0xFF))
            };
            allItem.Checked += GenreCheckbox_Changed;
            allItem.Unchecked += GenreCheckbox_Changed;
            GenreFilterList.Items.Add(allItem);

            var shown = 0;
            foreach (var name in _allGenreNames.OrderBy(n => n))
            {
                if (!string.IsNullOrEmpty(filter) && name.IndexOf(filter, StringComparison.OrdinalIgnoreCase) < 0) continue;
                if (shown == 0)
                    GenreFilterList.Items.Add(new Border { Height = 1, Background = new SolidColorBrush(Color.FromArgb(0x14, 0xFF, 0xFF, 0xFF)), Margin = new Thickness(0, 4, 0, 4) });
                var cb = new CheckBox
                {
                    Content = name,
                    Tag = name,
                    IsChecked = _selectedGenres.Contains(name),
                    Margin = new Thickness(4, 2, 4, 2),
                    Foreground = new SolidColorBrush(Color.FromArgb(0xCC, 0xFF, 0xFF, 0xFF))
                };
                cb.Checked += GenreCheckbox_Changed;
                cb.Unchecked += GenreCheckbox_Changed;
                GenreFilterList.Items.Add(cb);
                shown++;
            }
        }

        private void GenreSearchBox_TextChanged(object sender, TextChangedEventArgs e) => ReloadGenreCheckboxes(GenreSearchBox.Text.Trim());

        private void GenreFilterBtn_Click(object sender, RoutedEventArgs e)
        {
            if (!_genresLoaded) _ = PopulateGenresAsync();
            GenreFilterPopup.IsOpen = true;
        }

        private void GenreCheckbox_Changed(object sender, RoutedEventArgs e)
        {
            if (_ignoreFilterChanges) return;
            if (!(sender is CheckBox cb)) return;
            _ignoreFilterChanges = true;
            try
            {
                var items = GenreFilterList.Items.OfType<CheckBox>().ToList();
                var allCb = items.FirstOrDefault(i => (string)i.Tag == "__all__");
                if ((string)cb.Tag == "__all__")
                {
                    bool isChecked = cb.IsChecked == true;
                    foreach (var item in items)
                        if ((string)item.Tag != "__all__") item.IsChecked = isChecked;
                }
                _selectedGenres.Clear();
                foreach (var item in items)
                    if ((string)item.Tag != "__all__" && item.IsChecked == true)
                        _selectedGenres.Add((string)item.Tag);
                var subCheckboxes = items.Where(i => (string)i.Tag != "__all__").ToList();
                if (allCb != null)
                {
                    if (subCheckboxes.Count > 0 && subCheckboxes.Any(i => i.IsChecked == true) && !subCheckboxes.All(i => i.IsChecked == true))
                        allCb.IsChecked = null;
                    else allCb.IsChecked = true;
                }
                if (Catalog != null)
                {
                    Catalog.SelectedGenres.Clear();
                    foreach (var g in _selectedGenres)
                        Catalog.SelectedGenres.Add(g);
                }
            }
            finally { _ignoreFilterChanges = false; }
            UpdateGenreFilterText();
            _ = LoadGamesAsync(true);
        }

        private void UpdateGenreFilterText()
        {
            if (_selectedGenres.Count == 0 || _selectedGenres.Count == _allGenreNames.Count)
                GenreFilterText.Text = "All Genres";
            else
                GenreFilterText.Text = $"{_selectedGenres.Count} genre{(_selectedGenres.Count > 1 ? "s" : "")}";
        }
        #endregion

        #region Filters
        private void HasRepacksCheckbox_Changed(object sender, RoutedEventArgs e)
        {
            if (_ignoreFilterChanges) return;
            if (Catalog != null) Catalog.CurrentHasRepacks = HasRepacksCheckbox.IsChecked == true;
            _ = LoadGamesAsync(true);
        }

        private void SearchBox_KeyUp(object sender, KeyEventArgs e)
        {
            _searchTimer.Stop();
            _searchTimer.Start();
        }

        private async void GamesScrollViewer_ScrollChanged(object sender, ScrollChangedEventArgs e)
        {
            var scroll = (ScrollViewer)sender;
            if (scroll.VerticalOffset >= scroll.ScrollableHeight - 100)
                if (Catalog != null) await Catalog.LoadNextPage();
        }

        private void SourceFilter_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_ignoreFilterChanges) return;
            var item = SourceFilter.SelectedItem as ComboBoxItem;
            var newValue = item?.Tag?.ToString() ?? "";
            if (Catalog != null && Catalog.CurrentSource == newValue) return;
            if (Catalog != null) Catalog.CurrentSource = newValue;
            _ = LoadGamesAsync(true);
        }

        public async Task LoadFilterSourcesAsync()
        {
            try
            {
                var api = GamesNexusContext.Api;
                if (api == null) return;
                var sources = await api.GetSourcesAsync();
                await Dispatcher.InvokeAsync(() =>
                {
                    _ignoreFilterChanges = true;
                    SourceFilter.Items.Clear();
                    SourceFilter.Items.Add(new ComboBoxItem { Content = "All Repackers", IsSelected = true, Tag = "" });
                    foreach (var s in sources)
                    {
                        SourceFilter.Items.Add(new ComboBoxItem { Content = s.Name, Tag = s.Id });
                    }
                    _ignoreFilterChanges = false;
                });
            }
            catch { }
        }

        private void PlatformFilter_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_ignoreFilterChanges) return;
            var item = PlatformFilter.SelectedItem as ComboBoxItem;
            if (Catalog != null) Catalog.CurrentPlatform = item?.Tag?.ToString() ?? "";
            _ = LoadGamesAsync(true);
        }


        private void SortBy_Changed(object sender, SelectionChangedEventArgs e)
        {
            if (_ignoreFilterChanges) return;
            var item = SortByField.SelectedItem as ComboBoxItem;
            if (Catalog != null) Catalog.CurrentSortBy = item?.Content?.ToString() ?? "Release";
            _ = LoadGamesAsync(true);
        }

        private void SortOrder_Changed(object sender, SelectionChangedEventArgs e)
        {
            if (_ignoreFilterChanges) return;
            var item = SortOrderField.SelectedItem as ComboBoxItem;
            if (Catalog != null) Catalog.CurrentSortDesc = item?.Content?.ToString() == "Desc";
            _ = LoadGamesAsync(true);
        }

        private void ZoomSlider_ValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
        {
            _cardZoom = ZoomSlider.Value;
            if (GamesZoomTransformText != null)
                GamesZoomTransformText.Text = $"{(int)(_cardZoom * 100)}%";
            UpdateGameGrid();
        }

        private void UpdateGameGrid()
        {
            if (GamesScrollViewer == null || GamesList == null) return;
            const double baseCardWidth = 180.0;
            const double baseCardHeight = 310.0;
            const double baseMargin = 8.0;
            double availWidth = GamesScrollViewer.ActualWidth - 4;
            if (availWidth <= 0) availWidth = baseCardWidth;
            int columns = Math.Max(1, (int)(availWidth / (baseCardWidth * _cardZoom)));
            GridColumns = columns;
            CardHeight = baseCardHeight * _cardZoom;
            CardMargin = new Thickness(Math.Max(2, baseMargin * _cardZoom));
        }
        #endregion

        #region Game Selection
        private async void GameCard_MouseUp(object sender, MouseButtonEventArgs e)
        {
            var border = (Border)sender;
            if (!(border.Tag is Game game)) return;

            if (Catalog?.Games != null)
                foreach (var g in Catalog.Games) g.IsSelected = g.Id == game.Id;

            SidebarCtrl.ShowBasic(game);

            if (SidebarCol.Width.Value == 0)
            {
                CatalogMainCol.Width = new GridLength(_catalogStarWidth, GridUnitType.Star);
                SplitterCol.Width = new GridLength(10, GridUnitType.Pixel);
                SidebarCol.Width = new GridLength(_sidebarStarWidth, GridUnitType.Star);
            }

            var deepGame = await GamesNexusContext.Api.GetGameByIdAsync(game.Id);
            if (deepGame != null) SidebarCtrl.UpdateDeepDetails(deepGame);
        }

        private void CatalogGrid_MouseDown(object sender, MouseButtonEventArgs e)
        {
            SidebarCtrl.Close();
            CatalogMainCol.Width = new GridLength(1, GridUnitType.Star);
            SplitterCol.Width = new GridLength(0);
            SidebarCol.Width = new GridLength(0);

            if (Catalog?.Games != null)
                foreach (var g in Catalog.Games) g.IsSelected = false;
        }
        #endregion


        public async Task LoadFilterPlatformsAsync()
        {
            try
            {
                var api = GamesNexusContext.Api;
                if (api == null) return;
                var platforms = await api.GetPlatformsAsync();
                await Dispatcher.InvokeAsync(() =>
                {
                    _ignoreFilterChanges = true;
                    PlatformFilter.Items.Clear();
                    PlatformFilter.Items.Add(new ComboBoxItem { Content = "All Platforms", IsSelected = true, Tag = "" });
                    foreach (var p in platforms)
                    {
                        var pName = p.Name;
                        if (pName.Contains("Windows")) pName = "windows";
                        else if (pName.Contains("Mac")) pName = "apple-mac-os";

                        var slug = IconLoader.ToSlug(pName);
                        var icon = IconLoader.LoadIcon($"Shared\\Platforms\\{slug}.png");

                        var item = new ComboBoxItem();
                        if (icon != null)
                        {
                            var sp = new StackPanel { Orientation = Orientation.Horizontal };
                            var img = new Image { Source = icon, Width = 16, Height = 16, Margin = new Thickness(0, 0, 6, 0) };

                            RenderOptions.SetBitmapScalingMode(img, BitmapScalingMode.HighQuality);

                            sp.Children.Add(img);
                            sp.Children.Add(new TextBlock { Text = p.Name, VerticalAlignment = VerticalAlignment.Center });
                            item.Content = sp;
                        }
                        else
                        {
                            item.Content = p.Name;
                        }
                        item.Tag = p.Name;
                        PlatformFilter.Items.Add(item);
                    }
                    _ignoreFilterChanges = false;
                });
            }
            catch { }
        }
    }
}