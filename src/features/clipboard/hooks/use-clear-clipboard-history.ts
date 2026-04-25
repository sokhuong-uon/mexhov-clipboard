import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clipboardDb } from "@/hooks/use-clipboard-db";
import { CLIPBOARD_HISTORY_KEY } from "@/features/clipboard/hooks/use-clipboard-history-query";

export const useClearClipboardHistory = () => {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    try {
      await clipboardDb.clearAll();
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_HISTORY_KEY] });
    } catch (err) {
      console.error("Failed to clear clipboard history:", err);
    }
  }, [queryClient]);
};
