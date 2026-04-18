import { useInfiniteQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { KlipyResponse } from "@/features/klipy/schema/klipy-response";

const API_KEY = import.meta.env.VITE_KLIPY_API_KEY;

export type KlipyErrorKind =
  | "missing_api_key"
  | "invalid_api_key"
  | "rate_limited"
  | "network"
  | "api"
  | "unknown";

export class KlipyError extends Error {
  constructor(
    public kind: KlipyErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "KlipyError";
  }
}

async function get<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  if (!API_KEY) {
    throw new KlipyError("missing_api_key", "VITE_KLIPY_API_KEY is not set");
  }
  try {
    const { data } = await axios.get<T>(path, {
      baseURL: `${import.meta.env.VITE_KLIPY_API_BASE_URL}/${API_KEY}`,
      params,
    });
    return data;
  } catch (e) {
    if (e instanceof AxiosError) {
      const status = e.response?.status;
      if (status === 401 || status === 403) {
        throw new KlipyError("invalid_api_key", "API key was rejected");
      }
      if (status === 429) {
        throw new KlipyError("rate_limited", "Too many requests");
      }
      if (!e.response) {
        throw new KlipyError("network", "Network request failed");
      }
      throw new KlipyError("api", `KLIPY returned ${status}`);
    }
    throw new KlipyError("unknown", String(e));
  }
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
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (!lastPage.result) return;
      if (!lastPage.data.has_next) return;

      return lastPageParam + 1;
    },
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
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (!lastPage.result) return;
      if (!lastPage.data.has_next) return;

      return lastPageParam + 1;
    },

    enabled: query.trim().length > 0,
  });
}
