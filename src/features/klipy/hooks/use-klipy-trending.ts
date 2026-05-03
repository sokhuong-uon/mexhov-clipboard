import { useInfiniteQuery } from "@tanstack/react-query";
import { KlipyResponse } from "@/features/klipy/schema/klipy-response";
import { klipyGet } from "@/features/klipy/utils/klipy-client";


export function useKlipyTrending(category?: string) {
  const perPageLimit = import.meta.env.VITE_KLIPY_PER_PAGE_LIMIT

  return useInfiniteQuery({
    queryKey: ["klipy", "trending", category],
    queryFn: ({ pageParam = 1 }) =>
      klipyGet<KlipyResponse>("/gifs/trending", {
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
  });
}
