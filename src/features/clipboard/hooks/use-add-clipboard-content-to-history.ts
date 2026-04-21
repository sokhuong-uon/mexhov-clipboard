import { RefObject, useCallback } from "react";
import { generateKeyBetween } from "jittered-fractional-indexing";
import { ClipboardContent, ClipboardItem } from "@/types/clipboard";
import { clipboardDb } from "@/hooks/use-clipboard-db";
import { buildTextClipboardItem } from "@/features/clipboard/build-text-clipboard-item";
import { buildImageClipboardItem } from "@/features/clipboard/build-image-clipboard-item";

export const useAddClipboardContentToHistory = (
  historyRef: RefObject<ClipboardItem[]>,
  invalidate: () => void,
) =>
  useCallback(
    async (content: ClipboardContent) => {
      const topSortOrder = generateKeyBetween(
        null,
        historyRef.current[0]?.sort_order ?? null,
      );

      let newItem;
      switch (content.type) {
        case "text":
          if (!content.text.trim()) return;
          newItem = buildTextClipboardItem(content.text, topSortOrder);
          break;
        case "image":
          if (!content.base64Data) return;
          newItem = buildImageClipboardItem(
            content.base64Data,
            content.width,
            content.height,
            topSortOrder,
          );
          break;
        case "empty":
          return;
      }

      try {
        const inserted = await clipboardDb.insertItem(newItem);
        await clipboardDb.dedupItem(inserted.id);
        invalidate();
      } catch (err) {
        console.error("Failed to insert clipboard item:", err);
      }
    },
    [historyRef, invalidate],
  );
