using GamesNexus.App;
using GamesNexus.Models;
using GamesNexus.Services;
using Playnite.SDK;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;

namespace GamesNexus.Views
{
    public partial class GameDetailSidebar : UserControl
    {
        private static readonly ILogger logger = LogManager.GetLogger();
        private Game _game;
        private List<Repack> _allRepacks = new List<Repack>();

        public event Action<BitmapSource> HeroImageChanged;
        public event Action<List<string>, int> ScreenshotClicked;
        public event Func<Game, Repack, Task> DownloadRequested;

        public GameDetailSidebar() { InitializeComponent(); }

        public void ShowBasic(Game game)
        {
            if (_game != null) _game.PropertyChanged -= Game_PropertyChanged;
            _game = game;
            if (_game != null) _game.PropertyChanged += Game_PropertyChanged;

            SidebarTitle.Text = game?.Name ?? "Unknown";
            SidebarDescription.Text = game?.Summary ?? "";
            SidebarCoverImage.Source = game?.CoverImageBitmap;

            HeroImageChanged?.Invoke(game?.HeroImageBitmap);

            if (SidebarRepackDownloadBtn != null)
            {
                SidebarRepackDownloadBtn.IsEnabled = false;
                if (SidebarRepackDownloadText != null)
                    SidebarRepackDownloadText.Text = "Download";
            }

            SidebarRoot.Visibility = Visibility.Visible;
            var sb = new Storyboard();
            var anim = new DoubleAnimation { From = 0, To = 1, Duration = new Duration(TimeSpan.FromSeconds(0.2)) };
            Storyboard.SetTarget(anim, SidebarRoot);
            Storyboard.SetTargetProperty(anim, new PropertyPath("Opacity"));
            sb.Children.Add(anim);
            sb.Begin();
        }

        public void UpdateDeepDetails(Game deepGame)
        {
            if (deepGame == null) return;

            string heroUrl = null;
            if (deepGame.Artworks != null && deepGame.Artworks.Count > 0)
                heroUrl = deepGame.Artworks[0].Url;
            else if (deepGame.Screenshots != null && deepGame.Screenshots.Count > 0)
                heroUrl = deepGame.Screenshots[0].Url;
            else if (!string.IsNullOrEmpty(deepGame.CoverUrl))
                heroUrl = deepGame.CoverUrl;

            if (heroUrl != null)
            {
                heroUrl = heroUrl.Replace("t_720p", "t_1080p").Replace("t_cover_big", "t_1080p").Replace("t_thumb", "t_1080p");
                _ = Task.Run(async () =>
                {
                    var bmp = await GamesNexusContext.Api.GetCachedImageAsync(heroUrl, 1920);
                    await Dispatcher.InvokeAsync(() => HeroImageChanged?.Invoke(bmp));
                });
            }

            SidebarDescription.Text = deepGame.Summary ?? SidebarDescription.Text;

            var dev = deepGame.Developers?.FirstOrDefault()?.Name;
            var pub = deepGame.Publishers?.FirstOrDefault()?.Name;
            var devPubMerged = string.Join(" / ", new[] { dev, pub }.Where(x => !string.IsNullOrEmpty(x)));
            SidebarDeveloper.Text = !string.IsNullOrEmpty(devPubMerged) ? devPubMerged : "Unknown Developer";

            var rd = deepGame.ReleaseDates?.FirstOrDefault();
            if (rd != null && rd.ReleaseDateUnix.HasValue)
            {
                var date = DateTimeOffset.FromUnixTimeSeconds(rd.ReleaseDateUnix.Value).ToString("yyyy-MM-dd");
                SidebarReleaseDate.Text = $"Release: {date}";
            }

            SidebarGenresPanel.Children.Clear();
            if (deepGame.Genres != null && deepGame.Genres.Count > 0)
            {
                foreach (var genre in deepGame.Genres)
                {
                    SidebarGenresPanel.Children.Add(new Border
                    {
                        Background = new SolidColorBrush(Color.FromArgb(0x14, 0xFF, 0xFF, 0xFF)),
                        CornerRadius = new CornerRadius(12),
                        Padding = new Thickness(10, 4, 10, 4),
                        Margin = new Thickness(0, 0, 6, 4),
                        Child = new TextBlock { Text = genre.Name, Foreground = new SolidColorBrush(Color.FromArgb(0x99, 0xFF, 0xFF, 0xFF)), FontSize = 12 }
                    });
                }
                SidebarGenresPanel.Visibility = Visibility.Visible;
            }

            SidebarScreenshotPanel.Children.Clear();
            if (deepGame.Screenshots != null && deepGame.Screenshots.Count > 0)
            {
                var urls = deepGame.Screenshots.Select(s => s.Url).ToList();
                for (int i = 0; i < urls.Count; i++)
                {
                    int capturedIdx = i;
                    var url = urls[i];
                    _ = Task.Run(async () =>
                    {
                        var bmp = await GamesNexusContext.Api.GetCachedImageAsync(url);
                        if (bmp != null)
                        {
                            await Dispatcher.InvokeAsync(() =>
                            {
                                var img = new System.Windows.Controls.Image { Source = bmp, Width = 200, Height = 112, Stretch = Stretch.UniformToFill, Margin = new Thickness(0, 0, 8, 0), Cursor = System.Windows.Input.Cursors.Hand };
                                img.MouseLeftButtonUp += (s, ev) => ScreenshotClicked?.Invoke(urls, capturedIdx);
                                SidebarScreenshotPanel.Children.Add(img);
                                SidebarScreenshotSection.Visibility = Visibility.Visible;
                            });
                        }
                    });
                }
            }

            if (deepGame.Repacks != null && deepGame.Repacks.Count > 0)
            {
                var newestRepack = deepGame.Repacks
                    .Where(r => !string.IsNullOrEmpty(r.UploadDate))
                    .OrderByDescending(r => r.UploadDate)
                    .FirstOrDefault();

                if (newestRepack != null)
                {
                    var dateOnly = newestRepack.UploadDate.Split('T')[0];
                    SidebarRepackDate.Text = $"Repacked: {dateOnly}";
                    SidebarRepackDateBadge.Visibility = Visibility.Visible;
                }
                else
                {
                    SidebarRepackDateBadge.Visibility = Visibility.Collapsed;
                }

                _allRepacks = deepGame.Repacks;
                ApplyRepackFilter();
                SidebarRepackSection.Visibility = Visibility.Visible;
            }
            else
            {
                SidebarRepackDateBadge.Visibility = Visibility.Collapsed;
                _allRepacks.Clear();
                SidebarRepackSection.Visibility = Visibility.Collapsed;
            }
        }

        private void Game_PropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == nameof(Game.CoverImageBitmap))
                Dispatcher.InvokeAsync(() => { if (SidebarCoverImage != null) SidebarCoverImage.Source = _game?.CoverImageBitmap; });
            else if (e.PropertyName == nameof(Game.HeroImageBitmap))
                Dispatcher.InvokeAsync(() => HeroImageChanged?.Invoke(_game?.HeroImageBitmap));
        }

        public void Close()
        {
            if (_game != null) _game.PropertyChanged -= Game_PropertyChanged;
            SidebarRoot.Visibility = Visibility.Collapsed;
            HeroImageChanged?.Invoke(null);
        }

        private void SidebarClose_Click(object sender, RoutedEventArgs e) => Close();

        private void ApplyRepackFilter()
        {
            if (SidebarRepackCombo == null) return;

            var filtered = _allRepacks.AsEnumerable()
                                      .OrderByDescending(r => r.UploadDate ?? "")
                                      .ToList();

            SidebarRepackCombo.ItemsSource = filtered;

            if (filtered.Count > 0)
            {
                SidebarRepackCombo.SelectedIndex = 0;
                SidebarRepackDownloadBtn.IsEnabled = true;
            }
            else
            {
                SidebarRepackDownloadBtn.IsEnabled = false;
            }

            SidebarRepackHeader.Text = $"Available Repacks ({filtered.Count})";
        }

        private void SidebarRepackCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (SidebarRepackDownloadBtn != null)
                SidebarRepackDownloadBtn.IsEnabled = SidebarRepackCombo.SelectedItem != null;
        }

        private async void SidebarRepackDownload_Click(object sender, RoutedEventArgs e)
        {
            if (!(SidebarRepackCombo.SelectedItem is Repack selected)) return;
            if (_game == null) return;

            if (SidebarRepackDownloadBtn != null)
            {
                SidebarRepackDownloadBtn.IsEnabled = false;
                if (SidebarRepackDownloadText != null)
                    SidebarRepackDownloadText.Text = "Starting...";
            }

            try
            {
                if (selected.HasMagnet)
                {
                    var magnet = selected.Uris?.FirstOrDefault(u => u.StartsWith("magnet:"));
                    if (magnet != null)
                    {
                        var settings = GamesNexusContext.Settings;
                        if (settings != null && settings.AutoOpenMagnet)
                            Process.Start(new ProcessStartInfo(magnet) { UseShellExecute = true });
                        else
                        {
                            Clipboard.SetText(magnet);
                            MessageBox.Show("Magnet link copied to clipboard!", "Magnet Link", MessageBoxButton.OK, MessageBoxImage.Information);
                        }
                    }
                }
                else
                {
                    var firstUri = selected.Uris?.FirstOrDefault();
                    if (!string.IsNullOrEmpty(firstUri))
                    {
                        Clipboard.SetText(firstUri);
                        MessageBox.Show("Download link copied to clipboard!", "Download Link", MessageBoxButton.OK, MessageBoxImage.Information);
                    }
                }

                if (DownloadRequested != null)
                    await DownloadRequested(_game, selected);
            }
            catch (Exception ex)
            {
                logger.Error(ex, "Download failed");
                MessageBox.Show($"Download failed: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                if (SidebarRepackDownloadBtn != null)
                {
                    SidebarRepackDownloadBtn.IsEnabled = true;
                    if (SidebarRepackDownloadText != null)
                        SidebarRepackDownloadText.Text = "Download";
                }
            }
        }
    }
}