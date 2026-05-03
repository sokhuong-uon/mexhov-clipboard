import { type Klipy } from "@/features/klipy/schema/klipy";

/**
 * Returns the URL to display in a thumbnail for a Klipy item. Prefers the
 * smallest webp variant, falls back to the gif. Returns "" if neither
 * exists, so consumers can hand the result straight to <img src>.
 */
export function pickThumbnailSource(item: Klipy): string {
  const variant = item.file.sm ?? item.file.xs ?? item.file.md;
  return variant?.webp?.url ?? variant?.gif?.url ?? "";
}
