import { useState, useMemo, useCallback } from "react";
import {
  ClipboardItem,
  ClipboardFilters,
  EMPTY_FILTERS,
  DateRange,
} from "@/types/clipboard";

const URL_RE = /https?:\/\/[^\s]+/i;

function getDateCutoff(range: DateRange): number | null {
  if (range === "all") return null;
  const now = Date.now();
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (range === "week") return now - 7 * 24 * 60 * 60 * 1000;
  if (range === "month") return now - 30 * 24 * 60 * 60 * 1000;
  return null;
}

function matchesContentFilter(item: ClipboardItem, types: Set<string>): boolean {
  if (types.size === 0) return true;
  for (const t of types) {
    if (t === "image" && item.content_type === "image") return true;
    if (t === "secret" && item.is_secret) return true;
    if (t === "env" && item.is_env) return true;
    if (t === "url" && item.text_content && URL_RE.test(item.text_content)) return true;
    if (t === "color" && item.detected_color) return true;
    if (t === "date" && item.detected_date) return true;
    if (t === "note" && item.note) return true;
  }
  return false;
}

export function applyFilters(
  items: ClipboardItem[],
  filters: ClipboardFilters,
  searchQuery: string,
): ClipboardItem[] {
  let result = items;

  if (filters.favorite) {
    result = result.filter((item) => item.is_favorite);
  }

  if (filters.contentTypes.size > 0) {
    result = result.filter((item) => matchesContentFilter(item, filters.contentTypes));
  }

  const cutoff = getDateCutoff(filters.dateRange);
  if (cutoff !== null) {
    result = result.filter((item) => Number(item.created_at) >= cutoff);
  }

  const q = searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter((item) => {
      if (item.content_type === "text" && item.text_content) {
        return item.text_content.toLowerCase().includes(q);
      }
      if (item.content_type === "image") {
        return "image".includes(q);
      }
      return false;
    });
  }

  return result;
}

export function useClipboardFilters(
  items: ClipboardItem[],
  searchQuery: string,
) {
  const [filters, setFilters] = useState<ClipboardFilters>({
    ...EMPTY_FILTERS,
    contentTypes: new Set(),
  });

  const filteredItems = useMemo(
    () => applyFilters(items, filters, searchQuery),
    [items, filters, searchQuery],
  );

  const toggleFavoriteFilter = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      favorite: !prev.favorite,
    }));
  }, []);

  return { filters, setFilters, filteredItems, toggleFavoriteFilter };
}
