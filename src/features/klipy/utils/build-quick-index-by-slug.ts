import { QUICK_PASTE_LIMIT } from "@/features/klipy/hooks/use-quick-paste-hotkeys";
import { type Klipy } from "@/features/klipy/schema/klipy";

/**
 * Builds a slug → 1-based quick-paste index map for the first
 * `QUICK_PASTE_LIMIT` items, used to render the Mod+N badge overlay.
 */
export function buildQuickIndexBySlug(items: Klipy[]): Map<string, number> {
  const map = new Map<string, number>();
  const limit = Math.min(items.length, QUICK_PASTE_LIMIT);
  for (let i = 0; i < limit; i++) {
    map.set(items[i].slug, i + 1);
  }
  return map;
}
