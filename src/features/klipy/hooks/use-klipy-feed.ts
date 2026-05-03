import { useMemo } from "react";

import { useKlipySearch } from "@/features/klipy/hooks/use-klipy-search";
import { useKlipyTrending } from "@/features/klipy/hooks/use-klipy-trending";
import { type Klipy } from "@/features/klipy/schema/klipy";

export type KlipyFeed = {
  items: Klipy[];
  isSearching: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

export function useKlipyFeed(searchQuery: string, category?: string): KlipyFeed {
  const trimmedQuery = searchQuery.trim();
  const isSearching = trimmedQuery.length > 0;

  const trending = useKlipyTrending(category);
  const search = useKlipySearch(trimmedQuery, category);
  const query = isSearching ? search : trending;

  const items = useMemo<Klipy[]>(() => {
    const pages = query.data?.pages;
    if (!pages) return [];
    const out: Klipy[] = [];
    for (const page of pages) {
      if (!page.result) continue;
      const data = page.data.data;
      if (!data) continue;
      for (const item of data) out.push(item);
    }
    return out;
  }, [query.data]);

  return {
    items,
    isSearching,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
