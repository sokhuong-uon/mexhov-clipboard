import { useCallback } from "react";
import { commands } from "@/bindings";
import { ClipboardItem } from "@/types/clipboard";
import type { Klipy } from "@/features/klipy/schema/klipy";
import { getKlipyPasteUrl } from "@/features/klipy/utils/klipy-url";

export function usePasteActions() {
  const pasteClipboardItem = useCallback(async (item: ClipboardItem) => {
    const result = await commands.pasteItem(
      item.content_type,
      item.text_content ?? null,
      item.image_data ?? null,
    );
    if (result.status === "error") {
      console.error("[pasteClipboardItem] paste_item failed:", result.error);
    }
  }, []);

  const pasteText = useCallback(async (text: string) => {
    const result = await commands.pasteItem("text", text, null);
    if (result.status === "error") {
      console.error("[pasteText] paste_item failed:", result.error);
    }
  }, []);

  const pasteKlipy = useCallback(async (item: Klipy) => {
    const url = getKlipyPasteUrl(item);
    if (!url) return;

    const downloaded = await commands.downloadMediaToTemp(url);
    if (downloaded.status === "error") {
      console.error("[pasteKlipy] download failed:", downloaded.error);
      return;
    }
    const [filePath] = downloaded.data;

    const pasted = await commands.pasteFileUri(filePath);
    if (pasted.status === "error") {
      console.error("[pasteKlipy] paste_file_uri failed:", pasted.error);
    }
  }, []);

  return { pasteClipboardItem, pasteText, pasteKlipy };
}
