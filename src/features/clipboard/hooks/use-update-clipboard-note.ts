import { useCallback } from "react";
import { clipboardDb } from "@/hooks/use-clipboard-db";

export const useUpdateClipboardNote = (invalidate: () => void) =>
  useCallback(
    async (id: number, note: string | null) => {
      try {
        await clipboardDb.updateNote(id, note);
        invalidate();
      } catch (err) {
        console.error("Failed to update clipboard note:", err);
      }
    },
    [invalidate],
  );
