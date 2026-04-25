import { useState } from "react";
import { ClipboardContent } from "@/types/clipboard";
import { useClipboardHistoryQuery } from "@/features/clipboard/hooks/use-clipboard-history-query";
import { useAddClipboardContentToHistory } from "@/features/clipboard/hooks/use-add-clipboard-content-to-history";
import { useDeleteClipboardItem } from "@/features/clipboard/hooks/use-delete-clipboard-item";
import { useToggleClipboardFavorite } from "@/features/clipboard/hooks/use-toggle-clipboard-favorite";
import { useUpdateClipboardNote } from "@/features/clipboard/hooks/use-update-clipboard-note";
import { useReorderClipboardItems } from "@/features/clipboard/hooks/use-reorder-clipboard-items";
import { useSplitClipboardEnvItem } from "@/features/clipboard/hooks/use-split-clipboard-env-item";

export const useClipboardHistory = (
  maxItems: number,
  favoritesFirst: boolean,
) => {
  const { history, historyRef, isLoaded, hasMore, loadMore, invalidate } =
    useClipboardHistoryQuery(maxItems, favoritesFirst);

  const [currentContent, setCurrentContent] = useState<ClipboardContent>({
    type: "empty",
  });

  const addContentToHistory = useAddClipboardContentToHistory(
    historyRef,
    invalidate,
  );
  const deleteItem = useDeleteClipboardItem(invalidate);
  const toggleFavorite = useToggleClipboardFavorite(invalidate);
  const updateNote = useUpdateClipboardNote(invalidate);
  const reorderItems = useReorderClipboardItems(
    historyRef,
    invalidate,
    maxItems,
    favoritesFirst,
  );
  const splitEnvItem = useSplitClipboardEnvItem(historyRef, invalidate);

  return {
    history,
    isLoaded,
    hasMore,
    loadMore,
    currentContent,
    setCurrentContent,
    addContentToHistory,
    deleteItem,
    toggleFavorite,
    updateNote,
    reorderItems,
    splitEnvItem,
  };
};
