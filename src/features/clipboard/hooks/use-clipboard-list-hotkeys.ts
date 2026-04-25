import { useState } from "react";
import {
  useHotkey,
  useHotkeys,
  useHotkeySequence,
} from "@tanstack/react-hotkeys";

import { useHotkeysConfig } from "@/hooks/use-hotkeys-config";
import { useClipboardNoteStore } from "@/features/clipboard/stores/clipboard-note-store";
import type { ClipboardItem as ClipboardItemType } from "@/types/clipboard";

export const QUICK_PASTE_LIMIT = 9;

type UseClipboardListHotkeysParams = {
  items: ClipboardItemType[];
  isActive: boolean;
  isSearching: boolean;
  onCopy: (item: ClipboardItemType) => void;
  onPaste?: (item: ClipboardItemType) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onToggleFavoriteFilter?: () => void;
};

export function useClipboardListHotkeys({
  items,
  isActive,
  isSearching,
  onCopy,
  onPaste,
  onDelete,
  onToggleFavorite,
  onToggleFavoriteFilter,
}: UseClipboardListHotkeysParams) {
  const { hotkeys } = useHotkeysConfig();
  const isEditingNote = useClipboardNoteStore((s) => s.isEditingNote);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [colorMenuItemId, setColorMenuItemId] = useState<number | null>(null);

  // Reset selection when toggling between list and search. Done during render
  // (not in an effect) so the next render already sees activeId === null —
  // otherwise the freshly-mounted SearchResultItem/SortableItem briefly
  // renders as active and its focus effect steals focus from the search box.
  const [prevIsSearching, setPrevIsSearching] = useState(isSearching);
  if (isSearching !== prevIsSearching) {
    setPrevIsSearching(isSearching);
    setActiveId(null);
  }

  const effectiveActiveId = isSearching === prevIsSearching ? activeId : null;
  const activeIndex =
    effectiveActiveId != null
      ? items.findIndex((i) => i.id === effectiveActiveId)
      : -1;

  const setActiveIndex = (index: number) => {
    setActiveId(index >= 0 && index < items.length ? items[index].id : null);
  };

  const moveDown = () => {
    if (items.length === 0) return;
    setActiveIndex(Math.min(activeIndex + 1, items.length - 1));
  };

  const moveUp = () => {
    if (items.length === 0) return;
    setActiveIndex(Math.max(activeIndex - 1, 0));
  };

  const copyActive = () => {
    if (activeIndex >= 0 && items[activeIndex]) onCopy(items[activeIndex]);
  };

  const pasteActive = () => {
    if (activeIndex >= 0 && items[activeIndex] && onPaste) {
      onPaste(items[activeIndex]);
    }
  };

  const deleteActive = () => {
    if (activeIndex < 0 || !items[activeIndex]) return;
    const nextIndex =
      activeIndex < items.length - 1 ? activeIndex + 1 : activeIndex - 1;
    const nextId = nextIndex >= 0 ? items[nextIndex].id : null;
    onDelete(items[activeIndex].id);
    setActiveId(nextId);
  };

  const colorMenuIsOpen = colorMenuItemId != null;
  const hotkeysDisabled = !isActive || colorMenuIsOpen || isEditingNote;

  useHotkey(hotkeys.moveDown, moveDown, { enabled: !hotkeysDisabled });
  useHotkey(hotkeys.moveUp, moveUp, { enabled: !hotkeysDisabled });

  useHotkey(hotkeys.copy, copyActive, {
    enabled: activeIndex >= 0 && !hotkeysDisabled,
    ignoreInputs: false,
  });

  useHotkey(hotkeys.paste, pasteActive, {
    enabled: activeIndex >= 0 && !hotkeysDisabled,
  });

  useHotkey(hotkeys.delete, deleteActive, {
    enabled: activeIndex >= 0 && !hotkeysDisabled,
  });

  useHotkey(
    hotkeys.favorite,
    () => {
      if (activeIndex >= 0 && items[activeIndex]) {
        onToggleFavorite(items[activeIndex].id);
      }
    },
    { enabled: activeIndex >= 0 && !hotkeysDisabled },
  );

  useHotkey(
    hotkeys.colorMenu,
    () => {
      if (activeIndex >= 0 && items[activeIndex]?.detected_color) {
        setColorMenuItemId(items[activeIndex].id);
      }
    },
    { enabled: activeIndex >= 0 && !hotkeysDisabled },
  );

  useHotkey(hotkeys.favoritesFirst, () => onToggleFavoriteFilter?.(), {
    enabled: !hotkeysDisabled,
  });

  useHotkey("ArrowDown", moveDown, { enabled: isActive });
  useHotkey("ArrowUp", moveUp, { enabled: isActive });

  useHotkeySequence([hotkeys.jumpTop], () => {
    if (!hotkeysDisabled && items.length > 0) setActiveIndex(0);
  });
  useHotkey(
    hotkeys.jumpBottom,
    () => {
      if (items.length > 0) setActiveIndex(items.length - 1);
    },
    { enabled: !hotkeysDisabled },
  );

  // Mod+1..9 quick-paste: works in list and search, including when search input is focused.
  useHotkeys(
    Array.from({ length: QUICK_PASTE_LIMIT }, (_, i) => ({
      hotkey: `Mod+${(i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` as const,
      callback: () => {
        const target = items[i];
        if (!target) return;
        if (onPaste) onPaste(target);
        else onCopy(target);
      },
      options: { enabled: !hotkeysDisabled && items.length > i },
    })),
  );

  return {
    activeIndex,
    setActiveId,
    colorMenuItemId,
    setColorMenuItemId,
  };
}
