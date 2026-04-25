import type { Hotkey } from "@tanstack/react-hotkeys";
import { commands } from "@/bindings";
import type { HotkeyConfig } from "@/features/hotkey/hotkey-actions";

const SETTINGS_KEY = "hotkeys";

export async function loadHotkeysFromSettings(): Promise<Partial<HotkeyConfig> | null> {
  const result = await commands.getSetting(SETTINGS_KEY);
  if (result.status !== "ok" || !result.data) return null;
  try {
    return JSON.parse(result.data) as Partial<HotkeyConfig>;
  } catch {
    return null;
  }
}

export function saveHotkeysToSettings(config: HotkeyConfig): void {
  commands.setSetting(SETTINGS_KEY, JSON.stringify(config));
}

export async function registerToggleShortcut(hotkey: Hotkey): Promise<void> {
  const result = await commands.setToggleShortcut(hotkey);
  if (result.status !== "ok") {
    console.error(`[hotkeys] failed to register ${hotkey}:`, result.error);
  }
}
