import { useCallback, useRef } from "react";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { commands } from "@/bindings";

type DownloadedMedia = { filePath: string; iconPath: string };

export function useDraggableMedia(url: string | undefined) {
  const cached = useRef<DownloadedMedia | null>(null);

  const download = useCallback(async (): Promise<DownloadedMedia | null> => {
    if (cached.current) return cached.current;
    if (!url) return null;
    const result = await commands.downloadMediaToTemp(url);
    if (result.status === "error") return null;
    const [filePath, iconPath] = result.data;
    cached.current = { filePath, iconPath };
    return cached.current;
  }, [url]);

  const preload = useCallback(async () => {
    await download();
  }, [download]);

  const handleDragStart = useCallback(
    async (e: React.MouseEvent) => {
      if (!url) return;
      e.preventDefault();
      const media = await download();
      if (!media) return;
      await startDrag({ item: [media.filePath], icon: media.iconPath });
    },
    [url, download],
  );

  return { preload, handleDragStart };
}
