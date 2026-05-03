import { useMemo } from "react";
import { useHotkeys } from "@tanstack/react-hotkeys";

type QuickPasteDigit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const QUICK_PASTE_LIMIT = 9;

/**
 * Wires Mod+1..Mod+9 to pick the first 9 entries from `items`. The hotkey
 * config array is memoized so we don't churn the underlying listener
 * registration on every parent render.
 */
export function useQuickPasteHotkeys<T>(
  items: T[],
  onPick: (item: T) => void,
  enabled: boolean,
) {
  const hotkeyConfigs = useMemo(
    () =>
      Array.from({ length: QUICK_PASTE_LIMIT }, (_, slotIndex) => {
        const digit = (slotIndex + 1) as QuickPasteDigit;
        return {
          hotkey: `Mod+${digit}` as const,
          callback: () => {
            const target = items[slotIndex];
            if (target !== undefined) onPick(target);
          },
          options: { enabled: enabled && items.length > slotIndex },
        };
      }),
    [items, onPick, enabled],
  );

  useHotkeys(hotkeyConfigs);
}
