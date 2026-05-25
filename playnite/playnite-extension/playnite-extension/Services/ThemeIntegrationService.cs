using System;
using System.Windows;
using System.Windows.Automation;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Media;

namespace GamesNexus.Services
{
    public static class ThemeIntegrationService
    {
        private static bool? _themeSupported;
        private static UIElement _toggleButton;
        private static ScrollViewer _storeScrollViewer;
        private static bool _eventsWired;

        public static bool IsThemeStoreSupported()
        {
            if (_themeSupported.HasValue)
                return _themeSupported.Value;

            try
            {
                var mainWindow = Application.Current?.MainWindow;
                if (mainWindow == null)
                {
                    _themeSupported = false;
                    return false;
                }

                var toggle = FindChild<UIElement>(mainWindow, "ToggleStoreButton");
                _themeSupported = toggle != null;
                _toggleButton = toggle;
            }
            catch
            {
                _themeSupported = false;
            }

            return _themeSupported.Value;
        }

        public static void ToggleStore()
        {
            var toggle = _toggleButton;
            if (toggle == null)
            {
                toggle = FindToggleButton();
                _toggleButton = toggle;
            }

            if (toggle is CheckBox checkBox)
            {
                checkBox.IsChecked = !checkBox.IsChecked;
            }
            else if (toggle is ToggleButton toggleButton)
            {
                toggleButton.IsChecked = !toggleButton.IsChecked;
            }
        }

        public static void WireAll()
        {
            if (_eventsWired) return;

            try
            {
                FindToggleButton();
                _eventsWired = true;
            }
            catch (Exception ex)
            {
                Playnite.SDK.LogManager.GetLogger().Error(ex, "Failed to wire store overlay");
            }
        }

        public static void WireStoreView()
        {
            try
            {
                var mainWindow = Application.Current?.MainWindow;
                if (mainWindow == null) return;

                var storeList = FindChild<ListBox>(mainWindow, "Store_ListGameItems");
                if (storeList != null)
                {
                    storeList.SelectionChanged -= OnStoreSelectionChanged;
                    storeList.SelectionChanged += OnStoreSelectionChanged;
                }
                else
                {
                    // Retry loop to give the WPF template time to generate the element
                    var timer = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromMilliseconds(500) };
                    int attempts = 0;
                    timer.Tick += (s, e) =>
                    {
                        attempts++;
                        storeList = FindChild<ListBox>(mainWindow, "Store_ListGameItems");
                        if (storeList != null || attempts > 10)
                        {
                            timer.Stop();
                            if (storeList != null)
                            {
                                storeList.SelectionChanged -= OnStoreSelectionChanged;
                                storeList.SelectionChanged += OnStoreSelectionChanged;
                            }
                        }
                    };
                    timer.Start();
                }
            }
            catch (Exception ex)
            {
                Playnite.SDK.LogManager.GetLogger().Error(ex, "Failed to wire store pagination");
            }
        }

        private static void OnStoreSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            var listBox = sender as ListBox;
            if (listBox != null && listBox.Items.Count > 0 && listBox.SelectedIndex >= listBox.Items.Count - 6)
            {
                var vm = App.GamesNexusContext.MainVM?.CatalogVM;
                if (vm != null && !vm.IsLoading && vm.HasMore)
                {
                    _ = vm.LoadNextPage();
                }
            }
        }

        public static UIElement FindToggleButton()
        {
            var mainWindow = Application.Current?.MainWindow;
            if (mainWindow == null) return null;
            _toggleButton = FindChild<UIElement>(mainWindow, "ToggleStoreButton");
            return _toggleButton;
        }

        public static Grid FindStoreOverlay()
        {
            var mainWindow = Application.Current?.MainWindow;
            if (mainWindow == null) return null;
            return FindChild<Grid>(mainWindow, "StoreOverlay");
        }

        public static ScrollViewer FindStoreScrollViewer()
        {
            var mainWindow = Application.Current?.MainWindow;
            if (mainWindow == null) return null;

            var storeList = FindChild<FrameworkElement>(mainWindow, "Store_ListGameItems");
            if (storeList != null)
            {
                _storeScrollViewer = FindChild<ScrollViewer>(storeList, null);
                if (_storeScrollViewer != null) return _storeScrollViewer;
            }

            _storeScrollViewer = FindChildByAutomationId<ScrollViewer>(mainWindow, "StoreScrollViewer");
            if (_storeScrollViewer == null)
            {
                var fe = FindChild<FrameworkElement>(mainWindow, "StoreGamesList");
                if (fe != null)
                    _storeScrollViewer = FindChild<ScrollViewer>(fe, null);
            }
            return _storeScrollViewer;
        }

        private static T FindChildByAutomationId<T>(DependencyObject parent, string automationId) where T : DependencyObject
        {
            if (parent == null) return null;
            var count = VisualTreeHelper.GetChildrenCount(parent);
            for (int i = 0; i < count; i++)
            {
                var child = VisualTreeHelper.GetChild(parent, i);
                if (child is T typedChild)
                {
                    var id = typedChild.GetValue(AutomationProperties.AutomationIdProperty) as string;
                    if (id == automationId)
                        return typedChild;
                }
                var result = FindChildByAutomationId<T>(child, automationId);
                if (result != null) return result;
            }
            return null;
        }

        private static T FindChild<T>(DependencyObject parent, string childName) where T : DependencyObject
        {
            if (parent == null) return null;

            var count = VisualTreeHelper.GetChildrenCount(parent);
            for (int i = 0; i < count; i++)
            {
                var child = VisualTreeHelper.GetChild(parent, i);

                if (child is FrameworkElement fe && fe.Name == childName && child is T typedChild)
                    return typedChild;

                var result = FindChild<T>(child, childName);
                if (result != null) return result;
            }

            return null;
        }

        public static void ResetCache()
        {
            _themeSupported = null;
            _toggleButton = null;
            _storeScrollViewer = null;
            _eventsWired = false;
        }
    }
}