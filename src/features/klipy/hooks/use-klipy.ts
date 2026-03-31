import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import { KlipyResponse } from "../schema/klipy-response";

const API_KEY = import.meta.env.VITE_KLIPY_API_KEY;

async function get<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const { data } = await axios.get<T>(path, {
    baseURL: `${import.meta.env.VITE_KLIPY_API_BASE_URL}/${API_KEY}`,
    params,
  });
  console.log(`${path}`, data);
  return data;
}

const PER_PAGE = 20;

export function useKlipyTrending(category?: string) {
  return useInfiniteQuery({
    queryKey: ["klipy", "trending", category],
    queryFn: ({ pageParam = 1 }) =>
      get<KlipyResponse>("/gifs/trending", {
        page: String(pageParam),
        per_page: String(PER_PAGE),
        ...(category ? { category } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _, lastPageParam) =>
      lastPage.data.has_next ? lastPageParam + 1 : undefined,
  });
}

export function useKlipySearch(query: string, category?: string) {
  return useInfiniteQuery({
    queryKey: ["klipy", "search", query, category],
    queryFn: ({ pageParam = 1 }) =>
      get<KlipyResponse>("/gifs/search", {
        q: query,
        page: String(pageParam),
        per_page: String(PER_PAGE),
        ...(category ? { category } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _, lastPageParam) =>
      lastPage.data.has_next ? lastPageParam + 1 : undefined,
    enabled: query.trim().length > 0,
  });
}
