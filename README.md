# Mexboard: Clipboard Manager from Mexhov

Works on Linux, Windows, and probably MacOS too 🤔


<img width="395" height="627" alt="image" src="https://github.com/user-attachments/assets/6be02335-ead2-4c57-bf8d-dce8326a0f82" />
<img width="395" height="627" alt="image" src="https://github.com/user-attachments/assets/900b5163-8d3a-4b50-b400-fae882ee2f8c" />



## Features

- **Clipboard history tracking** - Automatically tracks all copied text and image items
- **Image clipboard support** - Full support for copying and pasting images from clipboard history
- **Quick copy from history** - Click any item to copy it back to clipboard
- **Monitoring toggle** - Pause/resume clipboard monitoring as needed
- **Clear history** - Delete individual items or clear all history at once
- **Automatic environment detection** - Automatically detects and adapts to Wayland or X11
- **System tray integration** - Access the application from system tray with show/hide/quit options
- **Single instance** - Only one instance runs at a time, preventing conflicts
- **Error handling** - Built-in retry logic and error recovery

## Development

**Prerequisites:**

- [Pnpm](https://pnpm.io/) package manager
- [Tauri](https://tauri.app/) toolchain
- System dependencies for Tauri (see [Tauri documentation](https://tauri.app/v1/guides/getting-started/prerequisites))


### Install dependencies

```bash
pnpm i
```

### Run in development mode
```bash
pnpm tauri dev
```

### Build for production
```bash
pnpm tauri build
```
