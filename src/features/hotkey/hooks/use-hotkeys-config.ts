import { useState, useCallback, useEffect, useMemo } from "react";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import type { Hotkey } from "@tanstack/react-hotkeys";
import {
  HOTKEY_ACTIONS,
  HOTKEY_META,
  getDefaultHotkeys,
  type HotkeyAction,
  type HotkeyConfig,
} from "@/features/hotkey/hotkey-actions";
import {
  loadHotkeysFromSettings,
  saveHotkeysToSettings,
  registerToggleShortcut,
} from "@/features/hotkey/hotkey-storage";

export function useHotkeysConfig() {
  const [hotkeys, setHotkeysState] = useState<HotkeyConfig>(getDefaultHotkeys);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await loadHotkeysFromSettings();
      if (stored) {
        setHotkeysState((prev) => ({ ...prev, ...stored }));
      }
      setIsLoaded(true);
    })();
  }, []);

  const setHotkey = useCallback((action: HotkeyAction, hotkey: Hotkey) => {
    setHotkeysState((prev) => {
      const next = { ...prev, [action]: hotkey };
      saveHotkeysToSettings(next);
      return next;
    });
    if (action === "toggleWindowVisibility") {
      void registerToggleShortcut(hotkey);
    }
  }, []);

  const resetHotkey = useCallback(
    (action: HotkeyAction) => {
      setHotkey(action, HOTKEY_META[action].defaultKey);
    },
    [setHotkey],
  );

  const resetAll = useCallback(() => {
    const defaults = getDefaultHotkeys();
    setHotkeysState(defaults);
    saveHotkeysToSettings(defaults);
    void registerToggleShortcut(defaults.toggleWindowVisibility);
  }, []);

  const formatted = useMemo(
    () =>
      Object.fromEntries(
        HOTKEY_ACTIONS.map((a) => [a, formatForDisplay(hotkeys[a])]),
      ) as Record<HotkeyAction, string>,
    [hotkeys],
  );

  return { hotkeys, formatted, setHotkey, resetHotkey, resetAll, isLoaded };
}
