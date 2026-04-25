import { memo, useState, useCallback } from "react";
import { type Klipy } from "@/features/klipy/schema/klipy";
import { getKlipyPasteUrl } from "@/features/klipy/klipy-url";
import { useDraggableMedia } from "@/hooks/use-draggable-media";
import { QuickPasteBadge } from "@/components/quick-paste-badge";
import { QUICK_PASTE_MODIFIER } from "@/features/hotkey/hooks/use-modifier-held";

type GifGridItemProps = {
  item: Klipy;
  onSelect: (item: Klipy) => void;
  quickIndex?: number | null;
};

export const GifGridItem = memo(
  ({ item, onSelect, quickIndex }: GifGridItemProps) => {
    const variant = item.file.sm ?? item.file.xs ?? item.file.md;
    const src = variant?.webp?.url ?? variant?.gif?.url ?? "";
    const [loaded, setLoaded] = useState(false);
    const { preload, handleDragStart } = useDraggableMedia(
      getKlipyPasteUrl(item),
    );

    const handleClick = useCallback(() => onSelect(item), [item, onSelect]);

    return (
      <div className="relative w-full h-full">
        {quickIndex != null && (
          <QuickPasteBadge index={quickIndex} className="top-1.5 left-1.5" />
        )}
        <button
          type="button"
          onMouseEnter={preload}
          onMouseDown={handleDragStart}
          onClick={handleClick}
          aria-label={item.title}
          aria-keyshortcuts={
            quickIndex != null
              ? `${QUICK_PASTE_MODIFIER}+${quickIndex}`
              : undefined
          }
          className="w-full h-full overflow-hidden rounded-lg bg-muted cursor-grab hover:ring-2 hover:ring-ring transition-shadow focus-visible:ring-2 focus-visible:ring-ring outline-none"
          title={item.title}
        >
          {item.blur_preview && (
            <img
              src={item.blur_preview}
              alt=""
              aria-hidden
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: loaded ? 0 : 1 }}
            />
          )}
          <img
            src={src}
            alt={item.title}
            loading="lazy"
            draggable={false}
            onLoad={() => setLoaded(true)}
            className="w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: loaded ? 1 : 0 }}
          />
        </button>
      </div>
    );
  },
);

GifGridItem.displayName = "GifGridItem";
