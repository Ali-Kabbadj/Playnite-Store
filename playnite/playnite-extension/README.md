#  GamesNexus Playnite Extension

[← Back to Root README](../../README.md) | [Read Architecture](../../docs/ARCHITECTURE_AND_PIPELINE.md)

This is the C# WPF extension that integrates directly into the Playnite Desktop Application. It allows users to browse the GamesNexus catalog, view deep details of games, and initiate repack downloads without ever leaving their library.

![Playnite Integration](../../docs/assets/playnite-extension-preview.png)
_(Placeholder: Add screenshot of the extension running inside Playnite)_

## 🛠️ Tech Stack

- **Language:** C#
- **Framework:** WPF, .NET Framework 4.6.2 (Required by Playnite SDK)
- **Architecture:** MVVM (Model-View-ViewModel)

## 🚀 Local Development Setup

### 1. Prerequisites

- **Visual Studio 2022** (with .NET desktop development workload).
- **Playnite** installed on your system.

### 2. Opening the Project

1. Open the `GamesNexus.slnx` or `GamesNexus.csproj` file in Visual Studio.
2. Ensure the `PlayniteSDK` NuGet package is restored.

### 3. Debugging / Building

To make development seamless, the project is configured with a **Pre-Build Event** that automatically kills the running Playnite process before compiling:

```powershell
Get-Process Playnite.DesktopApp -ErrorAction SilentlyContinue | Stop-Process -Force
```

**To Debug:**

1. Right-click the `GamesNexus` project -> **Properties** -> **Debug**.
2. Set the "Start Action" to **Start external program** and point it to your Playnite executable (e.g., `C:\Playnite\Playnite.DesktopApp.exe`).
3. Press `F5`. Visual Studio will compile the `.dll`, place it in the Playnite extensions folder, and launch Playnite with the debugger attached.

## 📦 Packing for Release

When you are ready to distribute an update to users, you need to pack the extension into a `.pext` file.

1. Download the `Toolbox.exe` from the official Playnite repository.
2. Run the following command:
   ```bash
   Toolbox.exe pack "path\to\playnite-extension" "path\to\output_directory"
   ```
3. Upload the resulting `GamesNexus.pext` to GitHub Releases.
