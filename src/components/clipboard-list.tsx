import { useCallback, useEffect, useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { AnimatePresence } from "motion/react";

import { EmptyState } from "@/components/clipboard-empty-state";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";
import { SortableItem } from "./sortable-item";
import { SearchResultItem } from "./search-result-item";

type ClipboardListProps = {
  items: ClipboardItemType[];
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
  onCopy,
  onDelete,
  onToggleFavorite,
  onReorder,
  onSplitEnv,
  isSearching = false,
  hasMore = false,
  onLoadMore,
}: ClipboardListProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset active index when items change during search
  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isSearching || items.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (items[activeIndex]) {
            onCopy(items[activeIndex]);
          }
          break;
      }
    },
    [isSearching, items, activeIndex, onCopy],
  );

  useEffect(() => {
    if (isSearching) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isSearching, handleKeyDown]);

  if (items.length === 0) {
    return <EmptyState />;
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
