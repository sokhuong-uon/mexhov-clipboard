import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { generateKeyBetween } from "jittered-fractional-indexing";
import { ClipboardItem, ClipboardContent } from "@/types/clipboard";
import { clipboardDb } from "@/hooks/use-clipboard-db";
import {
  enrichWithEnvDetection,
  enrichAllWithEnvDetection,
} from "@/hooks/clipboard-enrichment";
import { splitEnvItemInDb } from "@/hooks/clipboard-split-env";

export const useClipboardHistory = (maxItems: number) => {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [currentContent, setCurrentContent] = useState<ClipboardContent>({
    type: "empty",
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const historyRef = useRef(history);
  historyRef.current = history;

  const hasMore = history.length < totalCount;

  useEffect(() => {
    Promise.all([
      clipboardDb.getAllItems(maxItems).then(enrichAllWithEnvDetection),
      clipboardDb.getItemCount(),
    ])
      .then(([items, count]) => {
        setHistory(items);
        setTotalCount(count);
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load clipboard history:", err);
        setIsLoaded(true);
      });
  }, [maxItems]);

  const loadMore = useCallback(async () => {
    const currentLen = historyRef.current.length;
    try {
      const moreItems = await clipboardDb
        .getAllItems(maxItems, currentLen)
        .then(enrichAllWithEnvDetection);
      if (moreItems.length > 0) {
        setHistory((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const unique = moreItems.filter((i) => !existingIds.has(i.id));
          return [...prev, ...unique];
        });
      }
    } catch (err) {
      console.error("Failed to load more items:", err);
    }
  }, [maxItems]);

  const getTopSortOrder = useCallback((excludeId?: number) => {
    const items = historyRef.current;
    const first = excludeId ? items.find((i) => i.id !== excludeId) : items[0];
    return generateKeyBetween(null, first?.sort_order ?? null);
  }, []);

  const bumpExisting = useCallback(
    async (existingId: number) => {
      const newSortOrder = getTopSortOrder(existingId);
      const updated = await clipboardDb.bumpItem(existingId, newSortOrder);
      setHistory((prev) => [
        updated,
        ...prev.filter((i) => i.id !== existingId),
      ]);
    },
    [getTopSortOrder],
  );

  const insertAndTrim = useCallback(
    (item: ClipboardItem) => {
      setHistory((prev) => {
        const next = [item, ...prev];
        if (next.length > maxItems) {
          next
            .slice(maxItems)
            .forEach((i) => clipboardDb.deleteItem(i.id).catch(() => {}));
          return next.slice(0, maxItems);
        }
        return next;
      });
    },
    [maxItems],
  );

  const addTextToHistory = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const existing = historyRef.current.find(
        (item) => item.content_type === "text" && item.text_content === text,
      );

      if (existing) {
        try {
          await bumpExisting(existing.id);
        } catch (err) {
          console.error("Failed to bump clipboard item:", err);
        }
        return;
      }

      const now = Date.now().toString();
      const sortOrder = getTopSortOrder();

      try {
        const [detectedDate, detectedColor] = await Promise.all([
          invoke<string | null>("detect_date_content", { text }),
          invoke<string | null>("detect_color_content", { text }),
        ]);
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
          detected_date: detectedDate,
          detected_color: detectedColor,
          created_at: now,
          updated_at: now,
        });
        const item = await enrichWithEnvDetection(rawItem);
        insertAndTrim(item);
      } catch (err) {
        console.error("Failed to insert clipboard item:", err);
      }
    },
    [getTopSortOrder, bumpExisting, insertAndTrim],
  );

  const addImageToHistory = useCallback(
    async (base64Data: string, width: number, height: number) => {
      if (!base64Data) return;

      const existing = historyRef.current.find(
        (item) =>
          item.content_type === "image" && item.image_data === base64Data,
      );

      if (existing) {
        try {
          await bumpExisting(existing.id);
        } catch (err) {
          console.error("Failed to bump clipboard item:", err);
        }
        return;
      }

      const now = Date.now().toString();
      const sortOrder = getTopSortOrder();

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
          detected_date: null,
          detected_color: null,
          created_at: now,
          updated_at: now,
        });
        insertAndTrim(item);
      } catch (err) {
        console.error("Failed to insert clipboard item:", err);
      }
    },
    [getTopSortOrder, bumpExisting, insertAndTrim],
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

  const deleteItem = useCallback(async (id: number) => {
    try {
      await clipboardDb.deleteItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      setTotalCount((prev) => prev - 1);
    } catch (err) {
      console.error("Failed to delete clipboard item:", err);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await clipboardDb.clearAll();
      setHistory([]);
      setTotalCount(0);
    } catch (err) {
      console.error("Failed to clear clipboard history:", err);
    }
  }, []);

  const toggleFavorite = useCallback(async (id: number) => {
    try {
      const updated = await clipboardDb.toggleFavorite(id);
      setHistory((prev) =>
        prev.map((item) => (item.id === id ? updated : item)),
      );
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  }, []);

  const reorderItems = useCallback(async (activeId: number, overId: number) => {
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

    const updated = { ...moved, sort_order: newSortOrder };
    setHistory(
      reordered.map((item) => (item.id === activeId ? updated : item)),
    );

    try {
      await clipboardDb.updateSortOrders([
        { id: activeId, sort_order: newSortOrder },
      ]);
    } catch (err) {
      console.error("Failed to update sort order:", err);
      setHistory(items);
    }
  }, []);

  const splitEnvItem = useCallback(async (id: number) => {
    const items = historyRef.current;
    const itemIndex = items.findIndex((i) => i.id === id);
    if (itemIndex === -1) return;

    const item = items[itemIndex];
    const beforeSort = itemIndex > 0 ? items[itemIndex - 1].sort_order : null;
    const afterSort =
      itemIndex < items.length - 1 ? items[itemIndex + 1].sort_order : null;

    const newItems = await splitEnvItemInDb(item, beforeSort, afterSort);
    if (!newItems) return;

    setHistory((prev) => {
      const without = prev.filter((i) => i.id !== id);
      return [
        ...without.slice(0, itemIndex),
        ...newItems,
        ...without.slice(itemIndex),
      ];
    });
  }, []);

  return {
    history,
    isLoaded,
    hasMore,
    loadMore,
    currentContent,
    setCurrentContent,
    addTextToHistory,
    addImageToHistory,
    addContentToHistory,
    deleteItem,
    clearAll,
    toggleFavorite,
    reorderItems,
    splitEnvItem,
  };
};
