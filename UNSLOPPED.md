# Files that are not slop, have been unslopped, and have been taken care of. XD

```bash
public
└── icon.ico ✓
scripts
├── prepare-release.js
└── sync-version.js
src
├── assets
│   └── react.svg
├── components
│   ├── ui
│   │   ├── alert.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── collapsible.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── scroll-area.tsx
│   │   ├── sheet.tsx
│   │   ├── skeleton.tsx
│   │   ├── tabs.tsx
│   │   ├── toggle-group.tsx
│   │   ├── toggle.tsx
│   │   └── tooltip.tsx
│   ├── clipboard-empty-state.tsx
│   ├── clipboard-error-banner.tsx
│   ├── clipboard-filter-menu.tsx
│   ├── clipboard-item-actions.tsx
│   ├── clipboard-item-color.tsx
│   ├── clipboard-item-content.tsx
│   ├── clipboard-item-meta.tsx
│   ├── clipboard-item-skeleton.tsx
│   ├── clipboard-item.tsx
│   ├── clipboard-list.tsx
│   ├── clipboard-tab.tsx
│   ├── clipboard-window-header.tsx
│   ├── color-format-menu.tsx
│   ├── color-preview.tsx
│   ├── gif-grid-item.tsx
│   ├── gif-view.tsx
│   ├── link-preview.tsx
│   ├── quick-paste-badge.tsx
│   ├── search-result-item.tsx
│   ├── sortable-item.tsx
│   └── symbols-view.tsx
├── features
│   ├── clipboard
│   │   ├── components
│   │   │   ├── no-matched-clipboard.tsx ✓
│   │   │   ├── no-clipboard.tsx ✓
│   │   ├── hooks
│   │   │   ├── use-add-clipboard-content-to-history.ts
│   │   │   ├── use-clear-clipboard-history.ts
│   │   │   ├── use-clipboard-history-query.ts
│   │   │   ├── use-clipboard-history.ts
│   │   │   ├── use-delete-clipboard-item.ts
│   │   │   ├── use-reorder-clipboard-items.ts
│   │   │   ├── use-split-clipboard-env-item.ts
│   │   │   ├── use-toggle-clipboard-favorite.ts
│   │   │   └── use-update-clipboard-note.ts
│   │   ├── build-image-clipboard-item.ts
│   │   └── build-text-clipboard-item.ts
│   ├── klipy
│   │   ├── hooks
│   │   │   └── use-klipy.ts
│   │   ├── schema
│   │   │   ├── klipy-category-response.ts
│   │   │   ├── klipy-category.ts
│   │   │   ├── klipy-file.ts
│   │   │   ├── klipy-media.ts
│   │   │   ├── klipy-response.ts
│   │   │   ├── klipy-static.ts
│   │   │   └── klipy.ts
│   │   └── klipy-url.ts
│   └── preferences
│       ├── sync
│       │   ├── sync-cloud-connect.tsx
│       │   ├── sync-lan-connect.tsx
│       │   ├── sync-lan-server-card.tsx
│       │   ├── sync-settings.tsx
│       │   ├── sync-status-indicator.tsx
│       │   ├── use-discovered-devices.ts
│       │   └── use-sync.ts
│       ├── general-settings.tsx
│       ├── hotkey-row.tsx
│       ├── hotkeys-settings.tsx
│       ├── setting-row.tsx
│       └── settings-sheet.tsx
├── hooks
│   ├── clipboard-split-env.ts
│   ├── use-clipboard-db.ts
│   ├── use-clipboard-filters.ts
│   ├── use-clipboard-monitor.ts
│   ├── use-clipboard.ts
│   ├── use-draggable-media.ts
│   ├── use-hotkeys-config.ts
│   ├── use-modifier-held.ts
│   ├── use-paste-actions.ts
│   ├── use-settings.ts
│   └── use-system-theme.ts
├── lib
│   └── utils.ts
├── types
│   └── clipboard.ts
├── utils
│   ├── color.ts
│   └── formatting.ts
├── app.tsx
├── bindings.ts
├── main.css
├── main.tsx ✓
└── vite-env.d.ts
src-tauri
├── capabilities
│   ├── default.json
│   └── desktop.json
├── gen
│   └── schemas
│       ├── acl-manifests.json
│       ├── capabilities.json
│       ├── desktop-schema.json
│       └── linux-schema.json
├── src
│   ├── caret
│   │   ├── linux.rs
│   │   ├── macos.rs
│   │   ├── mod.rs
│   │   └── windows.rs
│   ├── clipboard
│   │   ├── arboard.rs
│   │   ├── image.rs
│   │   ├── manager.rs
│   │   └── mod.rs
│   ├── commands
│   │   ├── clipboard.rs
│   │   ├── db.rs
│   │   ├── media.rs
│   │   ├── mod.rs
│   │   ├── settings.rs
│   │   ├── shortcuts.rs
│   │   ├── sync.rs
│   │   ├── system.rs
│   │   └── window.rs
│   ├── db
│   │   ├── items
│   │   │   ├── delete.rs
│   │   │   ├── hash.rs
│   │   │   ├── insert.rs
│   │   │   ├── mod.rs
│   │   │   ├── query.rs
│   │   │   └── update.rs
│   │   ├── utils
│   │   │   └── mod.rs
│   │   ├── initialization.rs
│   │   ├── mod.rs
│   │   ├── schema.rs
│   │   └── settings.rs
│   ├── detection
│   │   ├── color.rs
│   │   ├── date.rs
│   │   ├── env.rs
│   │   ├── mod.rs
│   │   └── secret.rs
│   ├── sync
│   │   ├── client.rs
│   │   ├── cloud.rs
│   │   ├── crypto.rs
│   │   ├── mdns.rs
│   │   ├── mod.rs
│   │   ├── peer.rs
│   │   └── server.rs
│   ├── window
│   │   ├── main_window.rs
│   │   └── mod.rs
│   ├── clipboard_monitor.rs
│   ├── lib.rs
│   ├── main.rs
│   ├── schema.rs
│   ├── shortcuts.rs
│   └── tray.rs
├── build.rs
├── Cargo.lock
├── Cargo.toml
└── tauri.conf.json
CHANGELOG.md
components.json
index.html ✓
package.json
package-lock.json
pnpm-lock.yaml
pnpm-workspace.yaml ✓
README.md ✓
RELEASES.md
SETUP_RELEASE.md
skills-lock.json
tsconfig.json
tsconfig.node.json
UNSLOPPED.md ✓
vite.config.ts
```
