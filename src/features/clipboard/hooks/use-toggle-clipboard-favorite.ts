import { useCallback } from "react";
import { clipboardDb } from "@/hooks/use-clipboard-db";

export const useToggleClipboardFavorite = (invalidate: () => void) =>
  useCallback(
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
