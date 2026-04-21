import { useCallback } from "react";
import { clipboardDb } from "@/hooks/use-clipboard-db";

export const useClearClipboardHistory = (invalidate: () => void) =>
  useCallback(async () => {
    try {
      await clipboardDb.clearAll();
      invalidate();
    } catch (err) {
      console.error("Failed to clear clipboard history:", err);
    }
  }, [invalidate]);
