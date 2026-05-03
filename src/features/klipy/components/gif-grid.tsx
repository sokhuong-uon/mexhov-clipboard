import { useEffect, useMemo, useRef } from "react";

import { GifGridItem } from "@/features/klipy/components/gif-grid-item";
import { useScrollViewport } from "@/features/klipy/hooks/use-scroll-viewport";
import { computeMasonryLayout } from "@/features/klipy/masonry/compute-masonry-layout";
import { selectVisibleCells } from "@/features/klipy/masonry/select-visible-cells";
import { type Klipy } from "@/features/klipy/schema/klipy";

const COLUMN_COUNT = 3;
const COLUMN_GAP = 8;
const HORIZONTAL_PADDING = 32; // mx-4 on the inner container = 16px each side
const OFFSCREEN_OVERSCAN = 400; // px above/below viewport to keep mounted
const LOAD_MORE_THRESHOLD = 300; // px from bottom that triggers fetch-next

type GifGridProps = {
  items: Klipy[];
  isActive: boolean;
  modifierHeld: boolean;
  quickIndexBySlug: Map<string, number>;
  onSelect: (item: Klipy) => void;
  onReachEnd: () => void;
  hasMore: boolean;
  isFetchingMore: boolean;
};

export function GifGrid({
  items,
  isActive,
  modifierHeld,
  quickIndexBySlug,
  onSelect,
  onReachEnd,
  hasMore,
  isFetchingMore,
}: GifGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const viewport = useScrollViewport(scrollContainerRef, HORIZONTAL_PADDING);

  const { cells, totalHeight } = useMemo(
    () =>
      computeMasonryLayout(items, {
        containerWidth: viewport.width,
        columns: COLUMN_COUNT,
        gap: COLUMN_GAP,
      }),
    [items, viewport.width],
  );

  const visibleCells = useMemo(
    () =>
      selectVisibleCells(
        cells,
        viewport.scrollTop,
        viewport.height,
        OFFSCREEN_OVERSCAN,
      ),
    [cells, viewport.scrollTop, viewport.height],
  );

  // Keep `onReachEnd` in a ref so the trigger effect's dependency array
  // stays focused on actual scroll/size signals — React Query returns a
  // new function identity each render, which would otherwise re-fire it.
  const onReachEndRef = useRef(onReachEnd);
  onReachEndRef.current = onReachEnd;

  useEffect(() => {
    if (totalHeight <= 0 || !hasMore || isFetchingMore) return;
    const distanceFromBottom =
      totalHeight - (viewport.scrollTop + viewport.height);
    if (distanceFromBottom <= LOAD_MORE_THRESHOLD) {
      onReachEndRef.current();
    }
  }, [
    totalHeight,
    hasMore,
    isFetchingMore,
    viewport.scrollTop,
    viewport.height,
  ]);

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
      <div className="relative mx-4 mt-2 mb-4" style={{ height: totalHeight }}>
        {visibleCells.map((cell) => {
          const quickIndex =
            isActive && modifierHeld
              ? (quickIndexBySlug.get(cell.item.slug) ?? null)
              : null;
          return (
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
                quickIndex={quickIndex}
              />
            </div>
          );
        })}
        {isFetchingMore && (
          <div
            className="absolute left-0 right-0 flex justify-center py-2 text-sm text-muted-foreground"
            style={{ top: totalHeight }}
          >
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
