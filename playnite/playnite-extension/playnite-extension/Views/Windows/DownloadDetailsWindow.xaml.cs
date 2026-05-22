using GamesNexus.Models;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;

namespace GamesNexus.Views
{
    public partial class DownloadDetailsWindow : Window
    {
        private readonly ObservableCollection<FileSelectItem> _items;
        public List<int> SelectedIndices { get; private set; } = new List<int>();

        public DownloadDetailsWindow(List<TorrentFileMeta> files, List<int> previouslySelected)
        {
            InitializeComponent();

            _items = new ObservableCollection<FileSelectItem>(
                files.Select(f => new FileSelectItem
                {
                    Index = f.Index,
                    Name = f.Name,
                    Path = f.Path,
                    Length = f.Length,
                    LengthDisplay = FormatSize(f.Length),
                    IsSelected = previouslySelected == null || previouslySelected.Count == 0 || previouslySelected.Contains(f.Index)
                })
            );

            FileListBox.ItemsSource = _items;
        }

        private static string FormatSize(long bytes)
        {
            if (bytes <= 0) return "0 B";
            var sizes = new[] { "B", "KB", "MB", "GB", "TB" };
            var i = 0;
            var s = (double)bytes;
            while (s >= 1024 && i < sizes.Length - 1) { s /= 1024; i++; }
            return $"{s:F1} {sizes[i]}";
        }

        private void SelectAll_Click(object sender, RoutedEventArgs e)
        {
            foreach (var item in _items) item.IsSelected = true;
            FileListBox.Items.Refresh();
        }

        private void DeselectAll_Click(object sender, RoutedEventArgs e)
        {
            foreach (var item in _items) item.IsSelected = false;
            FileListBox.Items.Refresh();
        }

        private void Confirm_Click(object sender, RoutedEventArgs e)
        {
            SelectedIndices = _items.Where(f => f.IsSelected).Select(f => f.Index).ToList();
            DialogResult = true;
            Close();
        }

        private void Cancel_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }

    public class FileSelectItem : System.ComponentModel.INotifyPropertyChanged
    {
        public int Index { get; set; }
        public string Name { get; set; }
        public string Path { get; set; }
        public long Length { get; set; }
        public string LengthDisplay { get; set; }

        private bool _isSelected;
        public bool IsSelected
        {
            get => _isSelected;
            set { _isSelected = value; OnPropertyChanged(nameof(IsSelected)); }
        }

        public event System.ComponentModel.PropertyChangedEventHandler PropertyChanged;
        protected void OnPropertyChanged(string name) =>
            PropertyChanged?.Invoke(this, new System.ComponentModel.PropertyChangedEventArgs(name));
    }
}