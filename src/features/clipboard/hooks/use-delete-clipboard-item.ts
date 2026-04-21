import { useCallback } from "react";
import { clipboardDb } from "@/hooks/use-clipboard-db";

export const useDeleteClipboardItem = (invalidate: () => void) =>
  useCallback(
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
