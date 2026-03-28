import { invoke } from "@tauri-apps/api/core";
import { ClipboardItem } from "@/types/clipboard";

export async function enrichWithEnvDetection(
  item: ClipboardItem,
): Promise<ClipboardItem> {
  if (item.content_type === "text" && item.text_content) {
    const isEnv = await invoke<boolean>("detect_env_content", {
      text: item.text_content,
    });
    return { ...item, is_env: isEnv };
  }
  return item;
}

export async function enrichAllWithEnvDetection(
  items: ClipboardItem[],
): Promise<ClipboardItem[]> {
  return Promise.all(items.map(enrichWithEnvDetection));
}
