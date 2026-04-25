import type { Hotkey } from "@tanstack/react-hotkeys";

function detectPlatform(): "mac" | "windows" | "linux" {
  if (typeof navigator === "undefined") return "linux";
  const ua = navigator.userAgent;
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
  if (/Windows/i.test(ua)) return "windows";
  return "linux";
}

function getToggleWindowDefault(): Hotkey {
  switch (detectPlatform()) {
    case "mac":
      return "Shift+Meta+V";
    case "windows":
      return "Alt+Meta+V";
    default:
      return "Meta+V";
  }
}

type HotkeyMeta = { label: string; defaultKey: Hotkey };

export const HOTKEY_META = {
  moveDown: { label: "Move down", defaultKey: "J" },
  moveUp: { label: "Move up", defaultKey: "K" },
  copy: { label: "Copy item", defaultKey: "C" },
  paste: { label: "Paste item", defaultKey: "P" },
  delete: { label: "Delete item", defaultKey: "D" },
  favorite: { label: "Toggle favorite", defaultKey: "F" },
  colorMenu: { label: "Color menu", defaultKey: "A" },
  favoritesFirst: { label: "Favorites first", defaultKey: "O" },
  jumpTop: { label: "Jump to top", defaultKey: "G" },
  jumpBottom: { label: "Jump to bottom", defaultKey: "Shift+G" },
  cycleTabs: { label: "Cycle tabs", defaultKey: "T" },
  search: { label: "Focus search", defaultKey: "/" },
  toggleWindowVisibility: {
    label: "Toggle window visibility",
    defaultKey: getToggleWindowDefault(),
  },
} satisfies Record<string, HotkeyMeta>;

export type HotkeyAction = keyof typeof HOTKEY_META;
export type HotkeyConfig = Record<HotkeyAction, Hotkey>;

export const HOTKEY_ACTIONS = Object.keys(HOTKEY_META) as HotkeyAction[];

export function getDefaultHotkeys(): HotkeyConfig {
  return Object.fromEntries(
    HOTKEY_ACTIONS.map((action) => [action, HOTKEY_META[action].defaultKey]),
  ) as HotkeyConfig;
}
