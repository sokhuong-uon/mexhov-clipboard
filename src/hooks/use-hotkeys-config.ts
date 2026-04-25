import { useState, useCallback, useEffect, useMemo } from "react";
import { commands } from "@/bindings";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import type { Hotkey } from "@tanstack/react-hotkeys";

export type HotkeyAction =
  | "moveDown"
  | "moveUp"
  | "copy"
  | "paste"
  | "delete"
  | "favorite"
  | "colorMenu"
  | "favoritesFirst"
  | "jumpTop"
  | "jumpBottom"
  | "search"
  | "toggleWindowVisibility";

function detectPlatform(): "mac" | "windows" | "linux" {
  if (typeof navigator === "undefined") return "linux";
  const ua = navigator.userAgent;
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
  if (/Windows/i.test(ua)) return "windows";
  return "linux";
}

const TOGGLE_DEFAULT: Hotkey = (() => {
  switch (detectPlatform()) {
    case "mac":
      return "Shift+Meta+V";
    case "windows":
      return "Alt+Meta+V";
    default:
      return "Meta+V";
  }
})();

export const HOTKEY_META: Record<
  HotkeyAction,
  { label: string; defaultKey: Hotkey }
> = {
  moveDown: { label: "Move down", defaultKey: "J" },
  moveUp: { label: "Move up", defaultKey: "K" },
  copy: { label: "Copy item", defaultKey: "C" },
  paste: { label: "Paste item", defaultKey: "P" },
  delete: { label: "Delete item", defaultKey: "D" },
  favorite: { label: "Toggle favorite", defaultKey: "F" },
  colorMenu: { label: "Color menu", defaultKey: "A" },
  favoritesFirst: { label: "Favorites first", defaultKey: "O" },
  jumpTop: { label: "Jump to top", defaultKey: "T" },
  jumpBottom: { label: "Jump to bottom", defaultKey: "B" },
  search: { label: "Focus search", defaultKey: "/" },
  toggleWindowVisibility: {
    label: "Toggle window visibility",
    defaultKey: TOGGLE_DEFAULT,
  },
};

export const HOTKEY_ACTIONS = Object.keys(HOTKEY_META) as HotkeyAction[];

function getDefaults(): Record<HotkeyAction, Hotkey> {
  return Object.fromEntries(
    HOTKEY_ACTIONS.map((a) => [a, HOTKEY_META[a].defaultKey]),
  ) as Record<HotkeyAction, Hotkey>;
}

const SETTINGS_KEY = "hotkeys";

export type HotkeyConfig = Record<HotkeyAction, Hotkey>;

export function useHotkeysConfig() {
  const [hotkeys, setHotkeysState] = useState<HotkeyConfig>(getDefaults);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await commands.getSetting(SETTINGS_KEY);
        if (result.status === "ok" && result.data) {
          try {
            const parsed = JSON.parse(result.data) as Partial<HotkeyConfig>;
            setHotkeysState((prev) => ({ ...prev, ...parsed }));
          } catch {
            // invalid JSON — keep defaults
          }
        }
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback((next: HotkeyConfig) => {
    commands.setSetting(SETTINGS_KEY, JSON.stringify(next));
  }, []);

  const setHotkey = useCallback(
    (action: HotkeyAction, hotkey: Hotkey) => {
      setHotkeysState((prev) => {
        const next = { ...prev, [action]: hotkey };
        persist(next);
        return next;
      });
      if (action === "toggleWindowVisibility") {
        commands.setToggleShortcut(hotkey).then((res) => {
          if (res.status !== "ok") {
            console.error(
              `[hotkeys] failed to register ${hotkey}:`,
              res.error,
            );
          }
        });
      }
    },
    [persist],
  );

  const resetHotkey = useCallback(
    (action: HotkeyAction) => {
      setHotkey(action, HOTKEY_META[action].defaultKey);
    },
    [setHotkey],
  );

  const resetAll = useCallback(() => {
    const defaults = getDefaults();
    setHotkeysState(defaults);
    persist(defaults);
    commands.setToggleShortcut(defaults.toggleWindowVisibility).then((res) => {
      if (res.status !== "ok") {
        console.error(
          `[hotkeys] failed to register ${defaults.toggleWindowVisibility}:`,
          res.error,
        );
      }
    });
  }, [persist]);

  const formatted = useMemo(
    () =>
      Object.fromEntries(
        HOTKEY_ACTIONS.map((a) => [a, formatForDisplay(hotkeys[a])]),
      ) as Record<HotkeyAction, string>,
    [hotkeys],
  );

  return { hotkeys, formatted, setHotkey, resetHotkey, resetAll, isLoaded };
}
