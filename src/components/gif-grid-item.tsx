import { useState, useCallback, useRef } from "react";
import { type KlipyItem } from "@/hooks/use-klipy";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { invoke } from "@tauri-apps/api/core";

type GifGridItemProps = {
  item: KlipyItem;
  onSelect: (item: KlipyItem) => void;
};

function getDragUrl(item: KlipyItem): string | undefined {
  const variant = item.file.hd ?? item.file.md ?? item.file.sm;
  return variant?.gif?.url ?? variant?.webp?.url;
}

export const GifGridItem = ({ item, onSelect }: GifGridItemProps) => {
  const variant = item.file.sm ?? item.file.xs ?? item.file.md;
  const src = variant?.webp?.url ?? variant?.gif?.url ?? "";
  const [loaded, setLoaded] = useState(false);
  const cached = useRef<{ filePath: string; iconPath: string } | null>(null);
  const dragUrl = getDragUrl(item);

  const preload = useCallback(async () => {
    if (cached.current || !dragUrl) return;
    try {
      const [filePath, iconPath] = await invoke<[string, string]>(
        "download_media_to_temp",
        { url: dragUrl },
      );
      cached.current = { filePath, iconPath };
    } catch {}
  }, [dragUrl]);

  const handleMouseDown = useCallback(
    async (e: React.MouseEvent) => {
      if (!dragUrl) return;
      e.preventDefault();
      try {
        if (!cached.current) {
          const [filePath, iconPath] = await invoke<[string, string]>(
            "download_media_to_temp",
            { url: dragUrl },
          );
          cached.current = { filePath, iconPath };
        }
        const { filePath, iconPath } = cached.current;
        await startDrag({ item: [filePath], icon: iconPath });
      } catch {}
    },
    [dragUrl],
  );

  return (
    <button
      type="button"
      onMouseEnter={preload}
      onMouseDown={handleMouseDown}
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
};
