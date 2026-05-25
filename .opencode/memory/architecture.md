# Architecture Overview

## Theme-Integrated Pattern
The extension exposes `CatalogViewModel` as `Application.Current.Resources["GamesNexusCatalog"]`. Themes provide their own XAML in `Main.xaml` for the store overlay, binding to this resource.

## Key Components

### Extension (C# / WPF)
- `GamesNexusPlugin.cs` - Entry point. Registers resources, detects theme support during sidebar registration.
- `CatalogViewModel.cs` - Core VM with games, filters, commands. Theme integration commands added.
- `ThemeIntegrationService.cs` - Walks visual tree to find theme elements (ToggleStoreButton, StoreScrollViewer). Wires infinite scroll behavior.
- `GamesNexusContext.cs` - Static context, registers `GamesNexusCatalog` resource.

### Theme (XAML / WPF)
- `Main.xaml` - Main layout. Contains `ToggleStoreButton` (lines 302-327) and `StoreOverlay` (lines 1283-1365).
- `StoreOverlay` - Full-featured store UI: filter bar, game grid (UniformGrid 6 columns), game detail sidebar (right overlay).
- Cards match `ListGameItemTemplate` style: cover image + bottom metadata strip (platform icon, name, rating).

## Commands Exposed to Themes
All on `GamesNexusCatalog` resource:
- `ToggleStoreCommand` - Open/close store
- `SelectGameByIdCommand(string id)` - Select game by ID, shows detail sidebar
- `DownloadRepackCommand(Game|string)` - Select game (actual download TBD)
- `FilterByGenreCommand(string)`, `FilterBySourceCommand(string)`, `FilterByPlatformCommand(string)`
- `SortByCommand(string)` - Format: "Field,direction" e.g. "Release,desc"
- `SearchCommand(string)` - Set search text
- `LoadNextPageCommand` - Load more games (infinite scroll)
- `CloseSidebarCommand` - Close detail panel

## Theme Detection Flow
1. Plugin constructor calls `RegisterThemeResources()` via BeginInvoke
2. `GetSidebarItems()` checks `ApplicationMode.Fullscreen`, then calls `ThemeIntegrationService.IsThemeStoreSupported()`
3. If theme has `ToggleStoreButton` -> skip sidebar view, register toggle-only button
4. If not -> fallback to `MainView` sidebar item
5. After resources registered, `WireAll()` is called which attaches infinite scroll to StoreScrollViewer

## Layout (StoreOverlay)
```
┌─────────────────────────────────────────────────────┐
│ Filter Bar: [Genre] [Source] [Platform] Sort: Name  │
│            Search [... ]  Status 42/1000  [X]       │
├───────────────────────────────────┬─────────────────┤
│                                   │ Detail Panel    │
│  Games Grid (UniformGrid x6)      │ (right overlay) │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐    │ Cover + Name    │
│  │Card│ │Card│ │Card│ │Card│    │ Description      │
│  │img │ │img │ │img │ │img │    │ [Download]       │
│  │name│ │name│ │name│ │name│    │                  │
│  └────┘ └────┘ └────┘ └────┘    │                  │
│                                   │                  │
│  ┌────┐ ┌────┐ ┌────┐           │                  │
│  │Card│ │Card│ │Card│           │                  │
│  └────┘ └────┘ └────┘           │                  │
├───────────────────────────────────┴─────────────────┤
│ Loading indicator (overlay center)                   │
└─────────────────────────────────────────────────────┘
```
