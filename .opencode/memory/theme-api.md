# Theme API Reference

## How Any Theme Can Integrate the Store

A Playnite theme can provide native store UI by adding elements to its `Main.xaml`:

### 1. Add Store Toggle Button
```xml
<CheckBoxEx x:Name="ToggleStoreButton" 
            IsChecked="{Binding Source={DynamicResource GamesNexusCatalog}, Path=IsStoreOpen, Mode=TwoWay}">
    <!-- your button template -->
</CheckBoxEx>
```

### 2. Add Store Overlay Panel
```xml
<Grid x:Name="StoreOverlay" DataContext="{DynamicResource GamesNexusCatalog}"
      Grid.Row="1" Grid.RowSpan="3" Grid.ColumnSpan="3" Panel.ZIndex="100">
    <!-- Visibility is toggled by ToggleStoreButton.IsChecked via DataTrigger -->
    <Grid.Style>
        <Style TargetType="Grid">
            <Setter Property="Visibility" Value="Collapsed" />
            <Style.Triggers>
                <DataTrigger Binding="{Binding ElementName=ToggleStoreButton, Path=IsChecked}" Value="True">
                    <Setter Property="Visibility" Value="Visible" />
                </DataTrigger>
            </Style.Triggers>
        </Style>
    </Grid.Style>
    <!-- Your store UI here -->
</Grid>
```

### Available Resources
| Resource Key | Type | Description |
|---|---|---|
| `GamesNexusCatalog` | `CatalogViewModel` | Main store VM with all data + commands |
| `GamesNexusCommands` | `StoreCommandsWrapper` | Flat command wrappers for easier binding |
| `GamesNexusMainVM` | `MainViewModel` | Extension's main view model |

### Available Property Bindings (on GamesNexusCatalog)
| Property | Type | Description |
|---|---|---|
| `IsStoreOpen` | `bool` | Two-way: store visibility state |
| `IsSidebarOpen` | `bool` | Game detail panel visibility |
| `SelectedGame` | `Game` | Currently selected game |
| `Games` | `ObservableCollection<Game>` | Loaded games |
| `StatusText` | `string` | Current count text (e.g. "20") |
| `StatusTotalText` | `string` | Total count text (e.g. "/ 100 games") |
| `IsLoading` | `bool` | Loading state |
| `HasMore` | `bool` | More pages available |
| `TotalCount` | `int` | Total game count from API |
| `SearchText` | `string` | Two-way: current search query |
| `CurrentSortBy` | `string` | Current sort field |
| `CurrentSortDesc` | `bool` | Sort descending |

### Available Commands (on GamesNexusCatalog or GamesNexusCommands)
| Command | Parameter | Description |
|---|---|---|
| `ToggleStoreCommand` | none | Toggle store open/closed |
| `SelectGameByIdCommand` | `string` gameId | Select game, shows detail panel |
| `CloseSidebarCommand` | none | Close detail panel |
| `DownloadRepackCommand` | `Game` or `string` | Select game for download |
| `FilterByGenreCommand` | `string` genre | Filter by genre (empty = all) |
| `FilterBySourceCommand` | `string` source | Filter by repacker source |
| `FilterByPlatformCommand` | `string` platform | Filter by platform |
| `SortByCommand` | `string` "Field,dir" | Sort (e.g. "Release,desc") |
| `SearchCommand` | `string` query | Search games |
| `LoadNextPageCommand` | none | Load next page (infinite scroll) |

### Game Model Bindings
Each item in `Games` collection:
| Property | Type | Description |
|---|---|---|
| `Id` | `string` | Game ID |
| `Name` | `string` | Game title |
| `CoverImageBitmap` | `BitmapImage` | Loaded cover image |
| `PlatformIcon` | `BitmapImage` | Platform icon |
| `HasPlatformIcon` | `bool` | Whether platform icon is loaded |
| `Rating` | `double?` | Critic score |
| `Summary` | `string` | Game description |
| `PublisherBadge` | `string` | First publisher name |
| `Repacks` | `List<Repack>` | Available repacks |
| `IsSelected` | `bool` | Selection state |

### Required Named Elements (for extension auto-detection)
The extension looks for these in the visual tree:
- `ToggleStoreButton` (CheckBoxEx) - Store toggle button
- `StoreOverlay` (Grid) - Store overlay panel
- `StoreScrollViewer` (ScrollViewer) - For infinite scroll wiring (optional)
