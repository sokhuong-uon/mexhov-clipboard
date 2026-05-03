import type { Klipy } from "@/features/klipy/schema/klipy";

export function getKlipyPasteUrl(item: Klipy): string | undefined {
  const variant = item.file.hd ?? item.file.md ?? item.file.sm;
  return variant?.gif?.url ?? variant?.webp?.url;
}
