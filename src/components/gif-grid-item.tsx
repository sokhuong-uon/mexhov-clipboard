import { useState } from "react";
import { type KlipyItem } from "@/hooks/use-klipy";

type GifGridItemProps = {
  item: KlipyItem;
  onSelect: (item: KlipyItem) => void;
};

export const GifGridItem = ({ item, onSelect }: GifGridItemProps) => {
  const variant = item.file.sm ?? item.file.xs ?? item.file.md;
  const src = variant?.webp?.url ?? variant?.gif?.url ?? "";
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="w-full h-full overflow-hidden rounded-lg bg-muted cursor-pointer hover:ring-2 hover:ring-ring transition-shadow focus-visible:ring-2 focus-visible:ring-ring outline-none"
      title={item.title}
    >
      {item.blur_preview && (
        <img
          src={item.blur_preview}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: loaded ? 0 : 1 }}
        />
      )}
      <img
        src={src}
        alt={item.title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="w-full h-full object-cover transition-opacity duration-300"
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </button>
  );
};
