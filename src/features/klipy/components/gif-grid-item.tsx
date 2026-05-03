import { memo, useCallback } from "react";

import { QuickPasteBadge } from "@/components/quick-paste-badge";
import { QUICK_PASTE_MODIFIER } from "@/features/hotkey/hooks/use-modifier-held";
import { getKlipyPasteUrl } from "@/features/klipy/utils/klipy-url";
import { pickThumbnailSource } from "@/features/klipy/utils/pick-thumbnail-source";
import { type Klipy } from "@/features/klipy/schema/klipy";
import { useDraggableMedia } from "@/hooks/use-draggable-media";

type GifGridItemProps = {
  item: Klipy;
  onSelect: (item: Klipy) => void;
  quickIndex?: number | null;
};

export const GifGridItem = memo(function GifGridItem({
  item,
  onSelect,
  quickIndex,
}: GifGridItemProps) {
  const thumbnailSrc = pickThumbnailSource(item);
  const { preload, handleDragStart } = useDraggableMedia(
    getKlipyPasteUrl(item),
  );

  const handleClick = useCallback(() => onSelect(item), [item, onSelect]);

  const hasQuickIndex = quickIndex != null;

  return (
    <div className="relative w-full h-full">
      {hasQuickIndex && (
        <QuickPasteBadge index={quickIndex} className="top-1.5 left-1.5" />
      )}
      <button
        type="button"
        onMouseEnter={preload}
        onMouseDown={handleDragStart}
        onClick={handleClick}
        aria-label={item.title}
        aria-keyshortcuts={
          hasQuickIndex ? `${QUICK_PASTE_MODIFIER}+${quickIndex}` : undefined
        }
        className="w-full h-full overflow-hidden rounded-lg bg-muted cursor-grab hover:ring-2 hover:ring-ring transition-shadow focus-visible:ring-2 focus-visible:ring-ring outline-none"
        title={item.title}
      >
        <img
          src={thumbnailSrc}
          alt={item.title}
          loading="lazy"
          draggable={false}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
      </button>
    </div>
  );
});
