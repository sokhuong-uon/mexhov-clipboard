import { useCallback, useMemo } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";

import { EmptyState } from "@/components/clipboard-empty-state";
import { Button } from "@/components/ui/button";
import { ClipboardItemsGrid } from "@/components/clipboard-items-grid";
import {
  ClipboardItem as ClipboardItemType,
  ClipboardContent,
} from "@/types/clipboard";
import { useModifierHeld } from "@/hooks/use-modifier-held";
import { useClipboardNoteStore } from "@/features/clipboard/stores/clipboard-note-store";
import {
  useClipboardListHotkeys,
  QUICK_PASTE_LIMIT,
} from "@/features/clipboard/hooks/use-clipboard-list-hotkeys";
import { isItemCopied } from "@/features/clipboard/utils/is-item-copied";
import { SortableItem } from "./sortable-item";
import { SearchResultItem } from "./search-result-item";

type ClipboardListProps = {
  items: ClipboardItemType[];
  currentContent: ClipboardContent;
  onCopy: (item: ClipboardItemType) => void;
  onPaste?: (item: ClipboardItemType) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onReorder: (activeId: number, overId: number) => void;
  onSplitEnv?: (id: number) => void;
  onUpdateNote?: (id: number, note: string | null) => void;
  onToggleFavoriteFilter?: () => void;
  isSearching?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isActive?: boolean;
};

export const ClipboardList = ({
  items,
  currentContent,
  onCopy,
  onPaste,
  onDelete,
  onToggleFavorite,
  onReorder,
  onSplitEnv,
  onUpdateNote,
  onToggleFavoriteFilter,
  isSearching = false,
  hasMore = false,
  onLoadMore,
  isActive = true,
}: ClipboardListProps) => {
  const isEditingNote = useClipboardNoteStore((s) => s.isEditingNote);
  const modifierHeld = useModifierHeld();
  const showQuickPaste = isActive && modifierHeld && !isEditingNote;

  const { activeIndex, colorMenuItemId, setColorMenuItemId } =
    useClipboardListHotkeys({
      items,
      isActive,
      isSearching,
      onCopy,
      onPaste,
      onDelete,
      onToggleFavorite,
      onToggleFavoriteFilter,
    });

  const colorMenuHandlers = useMemo(
    () => new Map<number, (open: boolean) => void>(),
    [],
  );
  const getColorMenuHandler = useCallback(
    (itemId: number) => {
      let handler = colorMenuHandlers.get(itemId);
      if (!handler) {
        handler = (open: boolean) => setColorMenuItemId(open ? itemId : null);
        colorMenuHandlers.set(itemId, handler);
      }
      return handler;
    },
    [colorMenuHandlers, setColorMenuItemId],
  );

  const handleDragEnd = useCallback(
    (
      event: Parameters<
        NonNullable<React.ComponentProps<typeof DragDropProvider>["onDragEnd"]>
      >[0],
    ) => {
      const { source } = event.operation;
      if (!source || !isSortable(source)) return;

      const { index, initialIndex } = source.sortable;
      if (index === initialIndex) return;

      const sourceId = items[initialIndex]?.id;
      const overId = items[index]?.id;

      if (sourceId != null && overId != null && sourceId !== overId) {
        onReorder(sourceId, overId);
      }
    },
    [items, onReorder],
  );

  if (items.length === 0) {
    return <EmptyState isSearching={isSearching} />;
  }

  const quickIndexFor = (index: number) =>
    showQuickPaste && index < QUICK_PASTE_LIMIT ? index + 1 : null;

  if (isSearching) {
    return (
      <ClipboardItemsGrid
        items={items}
        ariaLabel="Search results"
        renderItem={(item, index) => (
          <SearchResultItem
            key={item.id}
            item={item}
            isActive={index === activeIndex}
            isCopied={isItemCopied(item, currentContent)}
            quickIndex={quickIndexFor(index)}
            onCopy={onCopy}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onSplitEnv={onSplitEnv}
            onUpdateNote={onUpdateNote}
            colorMenuOpen={colorMenuItemId === item.id}
            onColorMenuOpenChange={getColorMenuHandler(item.id)}
          />
        )}
      />
    );
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

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <ClipboardItemsGrid
        items={items}
        footer={loadMoreButton}
        renderItem={(item, index) => (
          <SortableItem
            key={item.id}
            item={item}
            index={index}
            isActive={index === activeIndex}
            isCopied={isItemCopied(item, currentContent)}
            quickIndex={quickIndexFor(index)}
            onCopy={onCopy}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onSplitEnv={onSplitEnv}
            onUpdateNote={onUpdateNote}
            colorMenuOpen={colorMenuItemId === item.id}
            onColorMenuOpenChange={getColorMenuHandler(item.id)}
          />
        )}
      />
    </DragDropProvider>
  );
};
