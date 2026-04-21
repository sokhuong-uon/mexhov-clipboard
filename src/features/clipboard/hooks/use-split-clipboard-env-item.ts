import { RefObject, useCallback } from "react";
import { ClipboardItem } from "@/types/clipboard";
import { splitEnvItemInDb } from "@/hooks/clipboard-split-env";

export const useSplitClipboardEnvItem = (
  historyRef: RefObject<ClipboardItem[]>,
  invalidate: () => void,
) =>
  useCallback(
    async (id: number) => {
      const items = historyRef.current;
      const itemIndex = items.findIndex((i) => i.id === id);
      if (itemIndex === -1) return;

      const item = items[itemIndex];
      const beforeSort = itemIndex > 0 ? items[itemIndex - 1].sort_order : null;
      const afterSort =
        itemIndex < items.length - 1 ? items[itemIndex + 1].sort_order : null;

      const splitItems = await splitEnvItemInDb(item, beforeSort, afterSort);
      if (!splitItems) return;

      invalidate();
    },
    [historyRef, invalidate],
  );
