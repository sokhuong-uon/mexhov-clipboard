/**
 * Returns the index of the column with the smallest current height. Used by
 * the masonry layout to decide where to place each next cell.
 */
export function shortestColumnIndex(columnHeights: number[]): number {
  let minHeight = columnHeights[0];
  let minIndex = 0;
  for (let i = 1; i < columnHeights.length; i++) {
    if (columnHeights[i] < minHeight) {
      minHeight = columnHeights[i];
      minIndex = i;
    }
  }
  return minIndex;
}
