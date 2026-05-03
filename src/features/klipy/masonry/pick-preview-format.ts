import { type Klipy } from "@/features/klipy/schema/klipy";
import { type KlipyStatic } from "@/features/klipy/schema/klipy-static";

/**
 * Returns the smallest available rendered format for a Klipy item, used to
 * derive the cell's natural width/height for masonry layout.
 */
export function pickPreviewFormat(item: Klipy): KlipyStatic | undefined {
  const variant = item.file.sm ?? item.file.xs ?? item.file.md;
  return variant?.webp ?? variant?.gif;
}
