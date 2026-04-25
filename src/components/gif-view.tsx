import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "@tanstack/react-hotkeys";

import { Skeleton } from "@/components/ui/skeleton";
import { GifGridItem } from "@/components/gif-grid-item";
import {
  useKlipyTrending,
  useKlipySearch,
  KlipyError,
} from "@/features/klipy/hooks/use-klipy";
import { type Klipy } from "@/features/klipy/schema/klipy";
import { useModifierHeld } from "@/hooks/use-modifier-held";
import { GifSearchBox } from "@/features/klipy/components/gif-search-box";
import { useGifSearchQueryStore } from "@/features/klipy/stores/gif-search-query-store";

const QUICK_PASTE_LIMIT = 9;

function klipyErrorMessage(error: unknown): string {
  if (error instanceof KlipyError) {
    switch (error.kind) {
      case "missing_api_key":
        return "KLIPY API key is missing.";
      case "invalid_api_key":
        return "KLIPY rejected the API key. Check your settings.";
      case "rate_limited":
        return "Too many requests — try again in a moment.";
      case "network":
        return "Network unavailable. Check your connection.";
      case "api":
        return "KLIPY service is having trouble. Try again later.";
    }
  }
  return "Failed to load GIFs.";
}

const COLUMNS = 3;
const GAP = 8;
const OVERSCAN = 400; // px above/below viewport to render

type PositionedCell = {
  item: Klipy;
  x: number;
  y: number;
  width: number;
  height: number;
};

function computeLayout(
  items: Klipy[],
  containerWidth: number,
): { cells: PositionedCell[]; totalHeight: number } {
  const colWidth = (containerWidth - GAP * (COLUMNS - 1)) / COLUMNS;
  const colHeights = new Array(COLUMNS).fill(0);
  const cells: PositionedCell[] = [];

  for (const item of items) {
    const variant = item.file.sm ?? item.file.xs ?? item.file.md;
    const format = variant?.webp ?? variant?.gif;
    const naturalW = format?.width ?? 200;
    const naturalH = format?.height ?? 200;
    const cellHeight = Math.round((naturalH / naturalW) * colWidth);

    const col = colHeights.indexOf(Math.min(...colHeights));
    const x = col * (colWidth + GAP);
    const y = colHeights[col];

    cells.push({ item, x, y, width: colWidth, height: cellHeight });
    colHeights[col] = y + cellHeight + GAP;
  }

  return { cells, totalHeight: Math.max(...colHeights, 0) };
}

type GifViewProps = {
  onSelect: (item: Klipy) => void;
  onPaste?: (item: Klipy) => void;
  isActive?: boolean;
};

export const GifView = ({
  onSelect,
  onPaste,
  isActive = true,
}: GifViewProps) => {
  const searchQuery = useGifSearchQueryStore((state) => state.searchQuery);
  const [selectedCategory] = useState<string | undefined>();

  const isSearching = searchQuery.trim().length > 0;

  const trending = useKlipyTrending(selectedCategory);
  const search = useKlipySearch(searchQuery, selectedCategory);

  const activeQuery = isSearching ? search : trending;

  const items = useMemo(() => {
    return (
      activeQuery.data?.pages.flatMap((page) => {
        if (!page.result) return [];
        return page.data.data ?? [];
      }) ?? []
    );
  }, [activeQuery.data]);

  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;
  const hasMore = activeQuery.hasNextPage;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  // Track container size
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setContainerWidth(rect.width - 32); // px-4 padding
        setViewportHeight(rect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const { cells, totalHeight } = useMemo(
    () => computeLayout(items, containerWidth),
    [items, containerWidth],
  );

  // Only render cells within viewport ± overscan
  const visibleCells = useMemo(() => {
    const top = scrollTop - OVERSCAN;
    const bottom = scrollTop + viewportHeight + OVERSCAN;
    return cells.filter(
      (cell) => cell.y + cell.height >= top && cell.y <= bottom,
    );
  }, [cells, scrollTop, viewportHeight]);

  // Infinite scroll: fetch when near bottom
  const fetchNext = useCallback(() => {
    if (hasMore && !activeQuery.isFetchingNextPage) {
      activeQuery.fetchNextPage();
    }
  }, [hasMore, activeQuery]);

  useEffect(() => {
    if (totalHeight === 0) return;
    if (scrollTop + viewportHeight >= totalHeight - 300) {
      fetchNext();
    }
  }, [scrollTop, viewportHeight, totalHeight, fetchNext]);

  const modifierHeld = useModifierHeld();

  const quickIndexBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < Math.min(items.length, QUICK_PASTE_LIMIT); i++) {
      map.set(items[i].slug, i + 1);
    }
    return map;
  }, [items]);

  useHotkeys(
    Array.from({ length: QUICK_PASTE_LIMIT }, (_, i) => ({
      hotkey: `Mod+${(i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` as const,
      callback: () => {
        const target = items[i];
        if (!target) return;
        if (onPaste) onPaste(target);
        else onSelect(target);
      },
      options: { enabled: isActive && items.length > i },
    })),
  );

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="px-4 py-1">
        <GifSearchBox className="flex-1 min-w-0" isActive={isActive} />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 p-4 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm px-4 text-center">
            {klipyErrorMessage(activeQuery.error)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            {isSearching ? "No GIFs found" : "No trending GIFs"}
          </div>
        ) : (
          <div
            className="relative mx-4 mt-2 mb-4"
            style={{ height: totalHeight }}
          >
            {visibleCells.map((cell) => (
              <div
                key={cell.item.slug}
                className="absolute"
                style={{
                  top: cell.y,
                  left: cell.x,
                  width: cell.width,
                  height: cell.height,
                }}
              >
                <GifGridItem
                  item={cell.item}
                  onSelect={onSelect}
                  quickIndex={
                    isActive && modifierHeld
                      ? (quickIndexBySlug.get(cell.item.slug) ?? null)
                      : null
                  }
                />
              </div>
            ))}
            {activeQuery.isFetchingNextPage && (
              <div
                className="absolute left-0 right-0 flex justify-center py-2 text-sm text-muted-foreground"
                style={{ top: totalHeight }}
              >
                Loading...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
