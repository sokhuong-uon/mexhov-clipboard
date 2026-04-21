import { useCallback, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardItem } from "@/types/clipboard";
import { clipboardDb } from "@/hooks/use-clipboard-db";

export const CLIPBOARD_HISTORY_KEY = "clipboard-history";

export type ClipboardHistoryPage = {
  items: ClipboardItem[];
  hasMore: boolean;
};

export const clipboardHistoryQueryKey = (
  maxItems: number,
  favoritesFirst: boolean,
) => [CLIPBOARD_HISTORY_KEY, maxItems, favoritesFirst] as const;

export const useClipboardHistoryQuery = (
  maxItems: number,
  favoritesFirst: boolean,
) => {
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: clipboardHistoryQueryKey(maxItems, favoritesFirst),
    queryFn: async ({ pageParam = 0 }): Promise<ClipboardHistoryPage> => {
      // Fetch one extra row to detect "has more" without a separate count query.
      const rows = await clipboardDb.getAllItems(
        maxItems + 1,
        pageParam,
        favoritesFirst,
      );
      return {
        items: rows.slice(0, maxItems),
        hasMore: rows.length > maxItems,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, p) => sum + p.items.length, 0);
    },
  });

  const history = data?.pages.flatMap((p) => p.items) ?? [];
  const historyRef = useRef(history);
  historyRef.current = history;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [CLIPBOARD_HISTORY_KEY] });
  }, [queryClient]);

  const loadMore = useCallback(() => {
    if (hasNextPage) fetchNextPage();
  }, [hasNextPage, fetchNextPage]);

  return {
    history,
    historyRef,
    isLoaded: !isLoading,
    hasMore: !!hasNextPage,
    loadMore,
    invalidate,
  };
};
