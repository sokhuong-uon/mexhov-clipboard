import { useInfiniteQuery } from "@tanstack/react-query";
import { KlipyResponse } from "@/features/klipy/schema/klipy-response";
import { klipyGet } from "@/features/klipy/utils/klipy-client";

export function useKlipySearch(query: string, category?: string) {
  const perPageLimit = import.meta.env.VITE_KLIPY_PER_PAGE_LIMIT

  return useInfiniteQuery({
    queryKey: ["klipy", "search", query, category],
    queryFn: ({ pageParam = 1 }) =>
      klipyGet<KlipyResponse>("/gifs/search", {
        q: query,
        page: String(pageParam),
        per_page: perPageLimit,
        ...(category ? { category } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (!lastPage.result) return;
      if (!lastPage.data.has_next) return;

      return lastPageParam + 1;
    },
    enabled: query.trim().length > 0,
  });
}
