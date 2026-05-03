import { type MasonryCell } from "@/features/klipy/masonry/masonry-types";

/**
 * Filters laid-out cells to those intersecting the visible band defined by
 * the current scroll offset, viewport height, and an overscan margin.
 */
export function selectVisibleCells(
  cells: MasonryCell[],
  scrollTop: number,
  viewportHeight: number,
  overscan: number,
): MasonryCell[] {
  const visibleTop = scrollTop - overscan;
  const visibleBottom = scrollTop + viewportHeight + overscan;
  const visible: MasonryCell[] = [];
  for (const cell of cells) {
    const cellBottom = cell.y + cell.height;
    if (cellBottom >= visibleTop && cell.y <= visibleBottom) {
      visible.push(cell);
    }
  }
  return visible;
}
