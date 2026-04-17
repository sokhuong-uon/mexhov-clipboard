import { useState, useCallback, useRef } from "react";
import { type Klipy } from "@/features/klipy/schema/klipy";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { commands } from "@/bindings";

type GifGridItemProps = {
  item: Klipy;
  onSelect: (item: Klipy) => void;
};

function getDragUrl(item: Klipy): string | undefined {
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
    const result = await commands.downloadMediaToTemp(dragUrl);
    if (result.status === "ok") {
      const [filePath, iconPath] = result.data;
      cached.current = { filePath, iconPath };
    }
  }, [dragUrl]);

  const handleMouseDown = useCallback(
    async (e: React.MouseEvent) => {
      if (!dragUrl) return;
      e.preventDefault();
      if (!cached.current) {
        const result = await commands.downloadMediaToTemp(dragUrl);
        if (result.status === "error") return;
        const [filePath, iconPath] = result.data;
        cached.current = { filePath, iconPath };
      }
      const { filePath, iconPath } = cached.current;
      await startDrag({ item: [filePath], icon: iconPath });
    },
    [dragUrl],
  );

  return (
    <button
      type="button"
      onMouseEnter={preload}
      onMouseDown={handleMouseDown}
      onClick={() => onSelect(item)}
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
