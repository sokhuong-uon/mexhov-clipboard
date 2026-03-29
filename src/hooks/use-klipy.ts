import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axios from "axios";

// ── Types (matching actual API response) ───────────────

type KlipyFormat = {
  url: string;
  width: number;
  height: number;
  size: number;
};

// Each size variant contains multiple format options
type KlipySizeVariant = {
  gif?: KlipyFormat;
  webp?: KlipyFormat;
  jpg?: KlipyFormat;
  mp4?: KlipyFormat;
  webm?: KlipyFormat;
};

export type KlipyItem = {
  id: number;
  slug: string;
  title: string;
  type: string;
  blur_preview: string;
  tags: string[];
  file: {
    hd?: KlipySizeVariant;
    md?: KlipySizeVariant;
    sm?: KlipySizeVariant;
    xs?: KlipySizeVariant;
  };
};

// The API wraps the list in { data: { data: [...], has_next, current_page, per_page } }
// axios unwraps the outer `data`, so we receive this shape:
type KlipyPage = {
  data: {
    current_page: number;
    data: KlipyItem[];
    has_next: boolean;
    per_page: number;
  };
  result: boolean;
};

export type KlipyCategory = {
  id: string;
  name: string;
  slug: string;
};

// ── Fetcher ────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_KLIPY_API_KEY;

async function get<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const { data } = await axios.get<T>(path, {
    baseURL: `${import.meta.env.VITE_KLIPY_API_BASE_URL}/${API_KEY}`,
    params,
  });
  return data;
}

const PER_PAGE = 20;

export function useKlipyTrending(category?: string) {
  return useInfiniteQuery({
    queryKey: ["klipy", "trending", category],
    queryFn: ({ pageParam = 1 }) =>
      get<KlipyPage>("/gifs/trending", {
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
      get<KlipyPage>("/gifs/search", {
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

export function useKlipyCategories() {
  return useQuery({
    queryKey: ["klipy", "categories"],
    queryFn: () => get<{ data: KlipyCategory[] }>("/gifs/categories"),
    staleTime: 1000 * 60 * 30,
  });
}
