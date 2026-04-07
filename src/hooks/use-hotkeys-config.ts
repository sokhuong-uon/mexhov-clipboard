import { useState, useCallback, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  | "searchAlt"
  | "toggleWindowVisibility";

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
  search: { label: "Focus search", defaultKey: "Mod+K" },
  searchAlt: { label: "Focus search (alt)", defaultKey: "I" },
  toggleWindowVisibility: { label: "Toggle window visibility", defaultKey: "Meta+V" },
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
    invoke<string | null>("get_setting", { key: SETTINGS_KEY })
      .then((value) => {
        if (value) {
          try {
            const parsed = JSON.parse(value) as Partial<HotkeyConfig>;
            setHotkeysState((prev) => ({ ...prev, ...parsed }));
          } catch {
            // invalid JSON — keep defaults
          }
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const persist = useCallback((next: HotkeyConfig) => {
    invoke("set_setting", {
      key: SETTINGS_KEY,
      value: JSON.stringify(next),
    });
  }, []);

  const setHotkey = useCallback(
    (action: HotkeyAction, hotkey: Hotkey) => {
      setHotkeysState((prev) => {
        const next = { ...prev, [action]: hotkey };
        persist(next);
        return next;
      });
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
