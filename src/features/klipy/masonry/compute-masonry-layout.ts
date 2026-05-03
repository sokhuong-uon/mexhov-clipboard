import {
  type MasonryCell,
  type MasonryLayout,
  type MasonryOptions,
} from "@/features/klipy/masonry/masonry-types";
import { pickPreviewFormat } from "@/features/klipy/masonry/pick-preview-format";
import { shortestColumnIndex } from "@/features/klipy/masonry/shortest-column-index";
import { type Klipy } from "@/features/klipy/schema/klipy";

const DEFAULT_NATURAL_DIMENSION = 200;

/**
 * Lays out items into a fixed-column masonry grid by always assigning the
 * next item to whichever column is currently shortest. Each cell's height
 * is derived from the item's natural aspect ratio.
 */
export function computeMasonryLayout(
  items: Klipy[],
  { containerWidth, columns, gap }: MasonryOptions,
): MasonryLayout {
  if (containerWidth <= 0 || columns <= 0 || items.length === 0) {
    return { cells: [], totalHeight: 0 };
  }

  const columnWidth = (containerWidth - gap * (columns - 1)) / columns;
  const columnHeights = new Array<number>(columns).fill(0);
  const cells: MasonryCell[] = new Array(items.length);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const previewFormat = pickPreviewFormat(item);
    const naturalWidth = previewFormat?.width ?? DEFAULT_NATURAL_DIMENSION;
    const naturalHeight = previewFormat?.height ?? DEFAULT_NATURAL_DIMENSION;
    const cellHeight = Math.round((naturalHeight / naturalWidth) * columnWidth);

    const targetColumn = shortestColumnIndex(columnHeights);
    const x = targetColumn * (columnWidth + gap);
    const y = columnHeights[targetColumn];

    cells[i] = { item, x, y, width: columnWidth, height: cellHeight };
    columnHeights[targetColumn] = y + cellHeight + gap;
  }

  let totalHeight = 0;
  for (const height of columnHeights) {
    if (height > totalHeight) totalHeight = height;
  }
  return { cells, totalHeight };
}
