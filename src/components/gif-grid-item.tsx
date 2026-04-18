import { memo, useState, useCallback } from "react";
import { type Klipy } from "@/features/klipy/schema/klipy";
import { useDraggableMedia } from "@/hooks/use-draggable-media";

type GifGridItemProps = {
  item: Klipy;
  onSelect: (item: Klipy) => void;
};

function getDragUrl(item: Klipy): string | undefined {
  const variant = item.file.hd ?? item.file.md ?? item.file.sm;
  return variant?.gif?.url ?? variant?.webp?.url;
}

export const GifGridItem = memo(({ item, onSelect }: GifGridItemProps) => {
  const variant = item.file.sm ?? item.file.xs ?? item.file.md;
  const src = variant?.webp?.url ?? variant?.gif?.url ?? "";
  const [loaded, setLoaded] = useState(false);
  const { preload, handleDragStart } = useDraggableMedia(getDragUrl(item));

  const handleClick = useCallback(() => onSelect(item), [item, onSelect]);

  return (
    <button
      type="button"
      onMouseEnter={preload}
      onMouseDown={handleDragStart}
      onClick={handleClick}
      aria-label={item.title}
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
  );
});

GifGridItem.displayName = "GifGridItem";
