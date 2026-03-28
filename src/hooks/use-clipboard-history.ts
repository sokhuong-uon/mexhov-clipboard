import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  generateKeyBetween,
  generateNKeysBetween,
} from "jittered-fractional-indexing";
import { ClipboardItem, ClipboardContent } from "@/types/clipboard";
import { clipboardDb } from "@/hooks/use-clipboard-db";

async function enrichWithEnvDetection(
  item: ClipboardItem,
): Promise<ClipboardItem> {
  if (item.content_type === "text" && item.text_content) {
    const isEnv = await invoke<boolean>("detect_env_content", {
      text: item.text_content,
    });
    return { ...item, is_env: isEnv };
  }
  return item;
}

async function enrichAllWithEnvDetection(
  items: ClipboardItem[],
): Promise<ClipboardItem[]> {
  return Promise.all(items.map(enrichWithEnvDetection));
}

const MAX_HISTORY_ITEMS = 50;

const debugLog = (label: string, items: ClipboardItem[]) => {
  console.group(`[clipboard-history] ${label}`);
  console.table(
    items.map((i) => ({
      id: i.id,
      type: i.content_type,
      sort_order: i.sort_order,
      preview:
        i.content_type === "text"
          ? (i.text_content ?? "").slice(0, 40)
          : `[image ${i.image_width}x${i.image_height}]`,
      copy_count: i.copy_count,
      is_favorite: i.is_favorite,
    })),
  );
  console.groupEnd();
};

export const useClipboardHistory = () => {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [currentContent, setCurrentContent] = useState<ClipboardContent>({
    type: "empty",
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const historyRef = useRef(history);
  historyRef.current = history;

  // Load history from database on mount
  useEffect(() => {
    clipboardDb
      .getAllItems()
      .then(enrichAllWithEnvDetection)
      .then((items) => {
        debugLog("LOADED from DB", items);
        setHistory(items);
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load clipboard history:", err);
        setIsLoaded(true);
      });
  }, []);

  // Generate a sort key that places a new item at the top (before the current first)
  const getTopSortOrder = useCallback((excludeId?: number) => {
    const items = historyRef.current;
    const first = excludeId ? items.find((i) => i.id !== excludeId) : items[0];
    return generateKeyBetween(null, first?.sort_order ?? null);
  }, []);

  const addTextToHistory = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const items = historyRef.current;
      const existing = items.find(
        (item) => item.content_type === "text" && item.text_content === text,
      );

      if (existing) {
        const newSortOrder = getTopSortOrder(existing.id);
        try {
          const updated = await clipboardDb.bumpItem(existing.id, newSortOrder);
          setHistory((prev) => {
            const next = [updated, ...prev.filter((i) => i.id !== existing.id)];
            debugLog("after BUMP text", next);
            return next;
          });
        } catch (err) {
          console.error("Failed to bump clipboard item:", err);
        }
        return;
      }

      const now = Date.now().toString();
      const sortOrder = getTopSortOrder();
      const charCount = text.length;
      const lineCount = text.split("\n").length;

      try {
        const rawItem = await clipboardDb.insertItem({
          content_type: "text",
          text_content: text,
          image_data: null,
          image_width: null,
          image_height: null,
          char_count: charCount,
          line_count: lineCount,
          source_app: null,
          sort_order: sortOrder,
          kv_key: null,
          created_at: now,
          updated_at: now,
        });
        const item = await enrichWithEnvDetection(rawItem);

        setHistory((prev) => {
          const next = [item, ...prev];
          if (next.length > MAX_HISTORY_ITEMS) {
            const toDelete = next.slice(MAX_HISTORY_ITEMS);
            toDelete.forEach((i) =>
              clipboardDb.deleteItem(i.id).catch(() => {}),
            );
            const trimmed = next.slice(0, MAX_HISTORY_ITEMS);
            debugLog("after INSERT text (trimmed)", trimmed);
            return trimmed;
          }
          debugLog("after INSERT text", next);
          return next;
        });
      } catch (err) {
        console.error("Failed to insert clipboard item:", err);
      }
    },
    [getTopSortOrder],
  );

  const addImageToHistory = useCallback(
    async (base64Data: string, width: number, height: number) => {
      if (!base64Data) return;

      const items = historyRef.current;
      const existing = items.find(
        (item) =>
          item.content_type === "image" && item.image_data === base64Data,
      );

      if (existing) {
        const newSortOrder = getTopSortOrder(existing.id);
        try {
          const updated = await clipboardDb.bumpItem(existing.id, newSortOrder);
          setHistory((prev) => {
            const next = [updated, ...prev.filter((i) => i.id !== existing.id)];
            debugLog("after BUMP image", next);
            return next;
          });
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
          created_at: now,
          updated_at: now,
        });

        setHistory((prev) => {
          const next = [item, ...prev];
          if (next.length > MAX_HISTORY_ITEMS) {
            const toDelete = next.slice(MAX_HISTORY_ITEMS);
            toDelete.forEach((i) =>
              clipboardDb.deleteItem(i.id).catch(() => {}),
            );
            const trimmed = next.slice(0, MAX_HISTORY_ITEMS);
            debugLog("after INSERT image (trimmed)", trimmed);
            return trimmed;
          }
          debugLog("after INSERT image", next);
          return next;
        });
      } catch (err) {
        console.error("Failed to insert clipboard item:", err);
      }
    },
    [getTopSortOrder],
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
    } catch (err) {
      console.error("Failed to delete clipboard item:", err);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await clipboardDb.clearAll();
      setHistory([]);
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
    const newHistory = reordered.map((item) =>
      item.id === activeId ? updated : item,
    );

    debugLog("after REORDER", newHistory);
    setHistory(newHistory);

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
    if (item.content_type !== "text" || !item.text_content) return;

    const pairs = await invoke<[string, string][]>("parse_env_content", {
      text: item.text_content,
    });
    if (pairs.length === 0) return;

    // Insert new items in-place: between the previous and next neighbors
    const beforeSort = itemIndex > 0 ? items[itemIndex - 1].sort_order : null;
    const afterSort =
      itemIndex < items.length - 1 ? items[itemIndex + 1].sort_order : null;

    // 2 slots per pair (key + value)
    const totalSlots = pairs.length * 2;
    const sortKeys = generateNKeysBetween(beforeSort, afterSort, totalSlots);

    const now = Date.now().toString();
    const newItems: ClipboardItem[] = [];

    for (let i = 0; i < pairs.length; i++) {
      const [key, value] = pairs[i];
      const keySortOrder = sortKeys[i * 2];
      const valueSortOrder = sortKeys[i * 2 + 1];

      // Insert the key as a clipboard item
      try {
        const keyItem = await clipboardDb.insertItem({
          content_type: "text",
          text_content: key,
          image_data: null,
          image_width: null,
          image_height: null,
          char_count: key.length,
          line_count: 1,
          source_app: null,
          sort_order: keySortOrder,
          kv_key: null,
          created_at: now,
          updated_at: now,
        });
        newItems.push(keyItem);
      } catch (err) {
        console.error("Failed to insert split env key:", err);
      }

      // Insert the value as a clipboard item labeled with its key
      try {
        const valueItem = await clipboardDb.insertItem({
          content_type: "text",
          text_content: value,
          image_data: null,
          image_width: null,
          image_height: null,
          char_count: value.length,
          line_count: value.split("\n").length,
          source_app: null,
          sort_order: valueSortOrder,
          kv_key: key,
          created_at: now,
          updated_at: now,
        });
        newItems.push(valueItem);
      } catch (err) {
        console.error("Failed to insert split env value:", err);
      }
    }

    // Delete the original item
    try {
      await clipboardDb.deleteItem(id);
    } catch (err) {
      console.error("Failed to delete original env item:", err);
    }

    setHistory((prev) => {
      const without = prev.filter((i) => i.id !== id);
      // Insert newItems at the original position
      const next = [
        ...without.slice(0, itemIndex),
        ...newItems,
        ...without.slice(itemIndex),
      ];
      debugLog("after SPLIT env", next);
      return next;
    });
  }, []);

  return {
    history,
    isLoaded,
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
