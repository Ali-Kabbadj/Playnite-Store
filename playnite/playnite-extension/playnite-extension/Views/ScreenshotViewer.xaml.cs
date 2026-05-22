using GamesNexus.App;
using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace GamesNexus.Views
{
    public partial class ScreenshotViewer : UserControl
    {
        private List<string> _screenshots = new List<string>();
        private int _index;
        private double _zoom = 1.0;
        private bool _dragging;
        private Point _dragStart;
        private double _dragOffsetX;
        private double _dragOffsetY;

        public bool IsOpen => ScreenshotOverlay.Visibility == Visibility.Visible;

        public ScreenshotViewer()
        {
            InitializeComponent();
        }

        public void Open(List<string> screenshots, int index)
        {
            _screenshots = screenshots;
            _index = index;
            _zoom = 1.0;
            ShowImage();
            ScreenshotOverlay.Visibility = Visibility.Visible;
            Focus();
        }

        public void Close()
        {
            ScreenshotOverlay.Visibility = Visibility.Collapsed;
        }

        private void ShowImage()
        {
            if (_index < 0 || _index >= _screenshots.Count) return;
            ScreenshotViewerPrev.IsEnabled = _index > 0;
            ScreenshotViewerNext.IsEnabled = _index < _screenshots.Count - 1;
            _ = Dispatcher.InvokeAsync(async () =>
            {
                var api = GamesNexusContext.Api;
                if (api == null) return;
                var bmp = await api.GetCachedImageAsync(_screenshots[_index]);
                if (bmp == null) return;
                ScreenshotViewerImage.Source = bmp;
                ScreenshotViewerCounter.Text = $"{_index + 1} / {_screenshots.Count}";
                ScreenshotViewerScale.ScaleX = _zoom;
                ScreenshotViewerScale.ScaleY = _zoom;
            });
        }

        private void ScreenshotViewer_Prev(object sender, RoutedEventArgs e)
        {
            if (_index > 0) { _index--; _zoom = 1.0; ShowImage(); }
        }

        private void ScreenshotViewer_Next(object sender, RoutedEventArgs e)
        {
            if (_index < _screenshots.Count - 1) { _index++; _zoom = 1.0; ShowImage(); }
        }

        private void ScreenshotViewer_Close(object sender, RoutedEventArgs e) => Close();

        private void ScreenshotViewer_MouseWheel(object sender, MouseWheelEventArgs e)
        {
            _zoom = Math.Max(0.5, Math.Min(5.0, _zoom + (e.Delta > 0 ? 0.25 : -0.25)));
            ScreenshotViewerScale.ScaleX = _zoom;
            ScreenshotViewerScale.ScaleY = _zoom;
        }

        private void ScreenshotViewer_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Escape) Close();
            if (e.Key == Key.Left) ScreenshotViewer_Prev(sender, e);
            if (e.Key == Key.Right) ScreenshotViewer_Next(sender, e);
        }

        private void ScreenshotViewer_MouseDown(object sender, MouseButtonEventArgs e)
        {
            _dragging = true;
            _dragStart = e.GetPosition(ScreenshotOverlay);
            _dragOffsetX = ScreenshotViewerTranslate.X;
            _dragOffsetY = ScreenshotViewerTranslate.Y;
            ScreenshotViewerImage.CaptureMouse();
        }

        private void ScreenshotViewer_MouseMove(object sender, MouseEventArgs e)
        {
            if (!_dragging) return;
            var pos = e.GetPosition(ScreenshotOverlay);
            ScreenshotViewerTranslate.X = _dragOffsetX + (pos.X - _dragStart.X);
            ScreenshotViewerTranslate.Y = _dragOffsetY + (pos.Y - _dragStart.Y);
        }

        private void ScreenshotViewer_MouseUp(object sender, MouseButtonEventArgs e)
        {
            _dragging = false;
            ScreenshotViewerImage.ReleaseMouseCapture();
        }
    }
}
