import { useEffect, useRef, useState } from "react";
import {
  useHotkey,
  useHotkeys,
  useHotkeySequence,
} from "@tanstack/react-hotkeys";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { AnimatePresence } from "motion/react";

import { EmptyState } from "@/components/clipboard-empty-state";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ClipboardItem as ClipboardItemType,
  ClipboardContent,
} from "@/types/clipboard";
import { SortableItem } from "./sortable-item";
import { SearchResultItem } from "./search-result-item";

export const isItemCopied = (
  item: ClipboardItemType,
  content: ClipboardContent,
): boolean => {
  if (content.type === "text" && item.content_type === "text") {
    return item.text_content === content.text;
  }
  if (content.type === "image" && item.content_type === "image") {
    return item.image_data === content.base64Data;
  }
  return false;
};

type ClipboardListProps = {
  items: ClipboardItemType[];
  currentContent: ClipboardContent;
  onCopy: (item: ClipboardItemType) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onReorder: (activeId: number, overId: number) => void;
  onSplitEnv?: (id: number) => void;
  isSearching?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
};

export const ClipboardList = ({
  items,
  currentContent,
  onCopy,
  onDelete,
  onToggleFavorite,
  onReorder,
  onSplitEnv,
  isSearching = false,
  hasMore = false,
  onLoadMore,
}: ClipboardListProps) => {
  const [activeId, setActiveId] = useState<number | null>(null);

  // Reset active item when searching changes results
  const isSearchingRef = useRef(isSearching);
  useEffect(() => {
    if (isSearching !== isSearchingRef.current) {
      setActiveId(null);
      isSearchingRef.current = isSearching;
    }
  }, [isSearching]);

  // Derive activeIndex from activeId
  const activeIndex = activeId != null ? items.findIndex((i) => i.id === activeId) : -1;

  const setActiveIndex = (index: number) => {
    setActiveId(index >= 0 && index < items.length ? items[index].id : null);
  };

  const moveDown = () => {
    if (items.length === 0) return;
    const next = Math.min(activeIndex + 1, items.length - 1);
    setActiveIndex(next);
  };

  const moveUp = () => {
    if (items.length === 0) return;
    const next = Math.max(activeIndex - 1, 0);
    setActiveIndex(next);
  };

  const copyActive = () => {
    if (activeIndex >= 0 && items[activeIndex]) {
      onCopy(items[activeIndex]);
    }
  };

  const deleteActive = () => {
    if (activeIndex >= 0 && items[activeIndex]) {
      // Move focus to next item (or previous if last)
      const nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : activeIndex - 1;
      const nextId = nextIndex >= 0 ? items[nextIndex].id : null;
      onDelete(items[activeIndex].id);
      setActiveId(nextId);
    }
  };

  // j/k navigation (ignored when input focused — default behavior)
  useHotkey("J", moveDown);
  useHotkey("K", moveUp);
  useHotkey("Enter", copyActive, {
    enabled: activeIndex >= 0,
    ignoreInputs: false,
  });

  // d to delete active item
  useHotkey("D", deleteActive, { enabled: activeIndex >= 0 });

  // Arrow keys for when list is focused (after tabbing from search)
  useHotkey("ArrowDown", moveDown);
  useHotkey("ArrowUp", moveUp);

  // Vim: gg to go to top, G to go to bottom
  useHotkeySequence(["G", "G"], () => {
    if (items.length > 0) setActiveIndex(0);
  });
  useHotkey("Shift+G", () => {
    if (items.length > 0) setActiveIndex(items.length - 1);
  });

  // Ctrl+1–9 to select search result by index (works even with input focused)
  useHotkeys(
    Array.from({ length: 9 }, (_, i) => ({
      hotkey: `Mod+${(i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` as const,
      callback: () => {
        if (items[i]) {
          onCopy(items[i]);
        }
      },
      options: { enabled: isSearching && items.length > i },
    })),
  );

  if (items.length === 0) {
    return <EmptyState isSearching={isSearching} />;
  }

  const loadMoreButton = hasMore && onLoadMore && (
    <li className="list-none">
      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={onLoadMore}
      >
        Load more
      </Button>
    </li>
  );

  if (isSearching) {
    return (
      <ScrollArea className="h-full">
        <ul
          className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2"
          role="listbox"
          aria-label="Search results"
        >
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <SearchResultItem
                key={item.id}
                item={item}
                isActive={index === activeIndex}
                isCopied={isItemCopied(item, currentContent)}
                onCopy={onCopy}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
                onSplitEnv={onSplitEnv}
              />
            ))}
          </AnimatePresence>
        </ul>
      </ScrollArea>
    );
  }

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source } = event.operation;
        if (!source || !isSortable(source)) return;

        const { index, initialIndex } = source.sortable;
        if (index === initialIndex) return;

        const sourceId = items[initialIndex]?.id;
        const overId = items[index]?.id;

        if (sourceId != null && overId != null && sourceId !== overId) {
          onReorder(sourceId, overId);
        }
      }}
    >
      <ScrollArea className="h-full">
        <ul className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <SortableItem
                key={item.id}
                item={item}
                index={index}
                isActive={index === activeIndex}
                isCopied={isItemCopied(item, currentContent)}
                onCopy={onCopy}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
                onSplitEnv={onSplitEnv}
              />
            ))}
          </AnimatePresence>
          {loadMoreButton}
        </ul>
      </ScrollArea>
    </DragDropProvider>
  );
};
