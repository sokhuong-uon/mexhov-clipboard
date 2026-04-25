import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import {
  CLIPBOARD_HISTORY_KEY,
  type ClipboardHistoryPage,
} from "@/features/clipboard/hooks/use-clipboard-history-query";

export const useHasClipboardHistory = (): boolean => {
  const queryClient = useQueryClient();

  const subscribe = useCallback(
    (callback: () => void) => queryClient.getQueryCache().subscribe(callback),
    [queryClient],
  );

  const getSnapshot = useCallback(() => {
    const queries = queryClient.getQueriesData<
      InfiniteData<ClipboardHistoryPage>
    >({ queryKey: [CLIPBOARD_HISTORY_KEY] });
    return queries.some(([, data]) =>
      data?.pages?.some((page) => page.items.length > 0),
    );
  }, [queryClient]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};
