import { useState, useCallback, useRef } from "react";
import { useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { generateKeyBetween } from "jittered-fractional-indexing";
import { ClipboardContent } from "@/types/clipboard";
import { clipboardDb } from "@/hooks/use-clipboard-db";
import { splitEnvItemInDb } from "@/hooks/clipboard-split-env";

const HISTORY_KEY = "clipboard-history";

export const useClipboardHistory = (maxItems: number, favoritesFirst: boolean) => {
  const queryClient = useQueryClient();
  const [currentContent, setCurrentContent] = useState<ClipboardContent>({
    type: "empty",
  });

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: [HISTORY_KEY, maxItems, favoritesFirst],
    queryFn: async ({ pageParam = 0 }) => {
      return clipboardDb.getAllItems(maxItems, pageParam, favoritesFirst);
    },
    initialPageParam: 0,
    getNextPageParam: (_lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, p) => sum + p.length, 0);
      // If last page was full, there might be more
      if (_lastPage.length === maxItems) return totalLoaded;
      return undefined;
    },
  });

  const history = data?.pages.flat() ?? [];
  const historyRef = useRef(history);
  historyRef.current = history;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [HISTORY_KEY] });
  }, [queryClient]);

  const getTopSortOrder = useCallback(() => {
    const items = historyRef.current;
    return generateKeyBetween(null, items[0]?.sort_order ?? null);
  }, []);

  const addTextToHistory = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const sortOrder = getTopSortOrder();
      const now = Date.now().toString();

      try {
        const rawItem = await clipboardDb.insertItem({
          content_type: "text",
          text_content: text,
          image_data: null,
          image_width: null,
          image_height: null,
          char_count: text.length,
          line_count: text.split("\n").length,
          source_app: null,
          sort_order: sortOrder,
          kv_key: null,
          created_at: now,
          updated_at: now,
        });
        // Dedup then refresh
        await clipboardDb.dedupItem(rawItem.id);
        invalidate();
      } catch (err) {
        console.error("Failed to insert clipboard item:", err);
      }
    },
    [getTopSortOrder, invalidate],
  );

  const addImageToHistory = useCallback(
    async (base64Data: string, width: number, height: number) => {
      if (!base64Data) return;

      const sortOrder = getTopSortOrder();
      const now = Date.now().toString();

      try {
        const item = await clipboardDb.insertItem({
          content_type: "image",
          text_content: null,
          image_data: base64Data,
          image_width: width,
          image_height: height,
          char_count: null,
          line_count: null,
          source_app: null,
          sort_order: sortOrder,
          kv_key: null,
          created_at: now,
          updated_at: now,
        });
        await clipboardDb.dedupItem(item.id);
        invalidate();
      } catch (err) {
        console.error("Failed to insert clipboard item:", err);
      }
    },
    [getTopSortOrder, invalidate],
  );

  const addContentToHistory = useCallback(
    (content: ClipboardContent) => {
      switch (content.type) {
        case "text":
          addTextToHistory(content.text);
          break;
        case "image":
          addImageToHistory(content.base64Data, content.width, content.height);
          break;
        case "empty":
          break;
      }
    },
    [addTextToHistory, addImageToHistory],
  );

  const deleteItem = useCallback(
    async (id: number) => {
      try {
        await clipboardDb.deleteItem(id);
        invalidate();
      } catch (err) {
        console.error("Failed to delete clipboard item:", err);
      }
    },
    [invalidate],
  );

  const clearAll = useCallback(async () => {
    try {
      await clipboardDb.clearAll();
      invalidate();
    } catch (err) {
      console.error("Failed to clear clipboard history:", err);
    }
  }, [invalidate]);

  const toggleFavorite = useCallback(
    async (id: number) => {
      try {
        await clipboardDb.toggleFavorite(id);
        invalidate();
      } catch (err) {
        console.error("Failed to toggle favorite:", err);
      }
    },
    [invalidate],
  );

  const updateNote = useCallback(
    async (id: number, note: string | null) => {
      try {
        await clipboardDb.updateNote(id, note);
        invalidate();
      } catch (err) {
        console.error("Failed to update note:", err);
      }
    },
    [invalidate],
  );

  const reorderItems = useCallback(
    async (activeId: number, overId: number) => {
      const items = historyRef.current;
      const oldIndex = items.findIndex((i) => i.id === activeId);
      const newIndex = items.findIndex((i) => i.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = [...items];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const before = newIndex > 0 ? reordered[newIndex - 1].sort_order : null;
      const after =
        newIndex < reordered.length - 1
          ? reordered[newIndex + 1].sort_order
          : null;
      const newSortOrder = generateKeyBetween(before, after);

      // Optimistic update
      const updated = { ...moved, sort_order: newSortOrder };
      queryClient.setQueryData([HISTORY_KEY, maxItems], (old: typeof data) => {
        if (!old) return old;
        const newFlat = reordered.map((item) =>
          item.id === activeId ? updated : item,
        );
        return { ...old, pages: [newFlat] };
      });

      try {
        await clipboardDb.updateSortOrders([
          { id: activeId, sort_order: newSortOrder },
        ]);
      } catch (err) {
        console.error("Failed to update sort order:", err);
        invalidate();
      }
    },
    [maxItems, queryClient, invalidate],
  );

  const splitEnvItem = useCallback(
    async (id: number) => {
      const items = historyRef.current;
      const itemIndex = items.findIndex((i) => i.id === id);
      if (itemIndex === -1) return;

      const item = items[itemIndex];
      const beforeSort = itemIndex > 0 ? items[itemIndex - 1].sort_order : null;
      const afterSort =
        itemIndex < items.length - 1 ? items[itemIndex + 1].sort_order : null;

      const newItems = await splitEnvItemInDb(item, beforeSort, afterSort);
      if (!newItems) return;

      invalidate();
    },
    [invalidate],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage) fetchNextPage();
  }, [hasNextPage, fetchNextPage]);

  return {
    history,
    isLoaded: !isLoading,
    hasMore: !!hasNextPage,
    loadMore,
    currentContent,
    setCurrentContent,
    addContentToHistory,
    deleteItem,
    clearAll,
    toggleFavorite,
    reorderItems,
    splitEnvItem,
    updateNote,
  };
};
