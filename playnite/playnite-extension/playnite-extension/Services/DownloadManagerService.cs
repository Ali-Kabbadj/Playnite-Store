using GamesNexus.Models;
using MonoTorrent;
using MonoTorrent.Client;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Threading;

namespace GamesNexus.Services
{
    public class DownloadManagerService
    {
        public ObservableCollection<Download> ActiveDownloads { get; private set; }

        private readonly Dispatcher _dispatcher;
        private readonly DispatcherTimer _progressTimer;
        private readonly ClientEngine _torrentEngine;
        private readonly Dictionary<string, TorrentManager> _torrentManagers;

        public DownloadManagerService()
        {
            ActiveDownloads = new ObservableCollection<Download>();
            _torrentManagers = new Dictionary<string, TorrentManager>();

            _dispatcher = Dispatcher.CurrentDispatcher;

            var engineSettings = new EngineSettingsBuilder
            {
                AllowPortForwarding = true,
                AutoSaveLoadDhtCache = true,
                AutoSaveLoadFastResume = true
            }.ToSettings();

            _torrentEngine = new ClientEngine(engineSettings);

            _progressTimer = new DispatcherTimer();
            _progressTimer.Interval = TimeSpan.FromSeconds(1);
            _progressTimer.Tick += UpdateUIProgress;
            _progressTimer.Start();
        }

        public async Task StartDownloadAsync(Game game, Repack repack, string uri)
        {
            if (game == null) return;
            if (repack == null) return;
            if (string.IsNullOrWhiteSpace(uri)) return;

            if (ActiveDownloads.Any(d => d.GameId == game.Id))
                return;

            var download = new Download
            {
                Id = Guid.NewGuid().ToString(),
                GameId = game.Id,
                Title = game.Name + " - " + repack.Title,
                Status = "starting",
                Progress = 0,
                DownloadSpeed = 0,
                Peers = 0,
                Seeds = 0,
                Eta = 0
            };

            await _dispatcher.InvokeAsync(() =>
            {
                ActiveDownloads.Add(download);
                game.ActiveDownload = download;
            });

            await HandleDownloadLogicAsync(download, uri);
        }

        private async Task HandleDownloadLogicAsync(Download download, string uri)
        {
            try
            {
                string downloadDir = App.GamesNexusContext.Settings != null
                    ? App.GamesNexusContext.Settings.DownloadDir
                    : @"C:\GamesNexus\Downloads";

                Directory.CreateDirectory(downloadDir);

                TorrentManager manager = null;

                if (uri.StartsWith("magnet:", StringComparison.OrdinalIgnoreCase))
                {
                    var magnet = MagnetLink.Parse(uri);
                    manager = await _torrentEngine.AddAsync(magnet, downloadDir);
                }
                else
                {
                    download.Status = "error";
                    return;
                }

                if (manager != null)
                {
                    _torrentManagers[download.Id] = manager;
                    await manager.StartAsync();
                    download.Status = "metadata";
                }
                else
                {
                    download.Status = "error";
                }
            }
            catch
            {
                download.Status = "error";
            }
        }

        private void UpdateUIProgress(object sender, EventArgs e)
        {
            foreach (var dl in ActiveDownloads)
            {
                TorrentManager manager;
                if (!_torrentManagers.TryGetValue(dl.Id, out manager))
                    continue;

                dl.Progress = manager.Progress;
                dl.DownloadSpeed = manager.Monitor.DownloadRate;
                dl.Peers = manager.Peers.Available;

                // MonoTorrent API differs between versions.
                // The old code used manager.Peers.Connected, which does not exist in your build.
                // Use 0 here to keep compilation clean until you confirm the exact seed/peer API
                // exposed by the MonoTorrent version you installed.
                dl.Seeds = 0;

                if (manager.State == TorrentState.Downloading)
                    dl.Status = "downloading";
                else if (manager.State == TorrentState.Metadata)
                    dl.Status = "metadata";
                else if (manager.State == TorrentState.Seeding)
                    dl.Status = "completed";
                else if (manager.State == TorrentState.Paused)
                    dl.Status = "paused";
                else if (manager.State == TorrentState.Error)
                    dl.Status = "error";

                if (manager.Monitor.DownloadRate > 0 && manager.Torrent != null)
                {
                    long remainingBytes = (long)((100.0 - manager.Progress) / 100.0 * manager.Torrent.Size);
                    dl.Eta = (int)(remainingBytes / manager.Monitor.DownloadRate);
                }
                else
                {
                    dl.Eta = 0;
                }
            }
        }

        public async Task PauseResumeDownload(string downloadId)
        {
            TorrentManager manager;
            if (!_torrentManagers.TryGetValue(downloadId, out manager))
                return;

            if (manager.State == TorrentState.Downloading || manager.State == TorrentState.Metadata)
            {
                await manager.PauseAsync();
            }
            else if (manager.State == TorrentState.Paused)
            {
                await manager.StartAsync();
            }
        }

        public async Task CancelDownload(string downloadId)
        {
            TorrentManager manager;
            if (_torrentManagers.TryGetValue(downloadId, out manager))
            {
                await manager.StopAsync();
                await _torrentEngine.RemoveAsync(manager);
                _torrentManagers.Remove(downloadId);
            }

            Download dl = ActiveDownloads.FirstOrDefault(d => d.Id == downloadId);
            if (dl == null)
                return;

            await _dispatcher.InvokeAsync(() =>
            {
                ActiveDownloads.Remove(dl);

                var game = App.GamesNexusContext.MainVM.AllGames.FirstOrDefault(g => g.Id == dl.GameId);
                if (game != null)
                    game.ActiveDownload = null;
            });
        }
    }
}