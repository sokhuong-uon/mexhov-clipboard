# Mexboard: Clipboard Manager from Mexhov

Works on Linux, Windows, and probably MacOS too 🤔

<img width="401" height="676" alt="image" src="https://github.com/user-attachments/assets/c0f51f52-9548-4ecf-848d-33519d34017d" />
<img width="401" height="676" alt="image" src="https://github.com/user-attachments/assets/7d7f643d-9741-448c-911f-e61d523efacb" />


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
