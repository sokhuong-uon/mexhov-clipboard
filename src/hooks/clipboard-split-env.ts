import { invoke } from "@tauri-apps/api/core";
import { generateNKeysBetween } from "jittered-fractional-indexing";
import { ClipboardItem } from "@/types/clipboard";
import { clipboardDb } from "@/hooks/use-clipboard-db";

/**
 * Splits an env-format clipboard item into individual key-value items.
 * Returns the new items to insert, or null if the split couldn't be performed.
 */
export async function splitEnvItemInDb(
  item: ClipboardItem,
  beforeSort: string | null,
  afterSort: string | null,
): Promise<ClipboardItem[] | null> {
  if (item.content_type !== "text" || !item.text_content) return null;

  const pairs = await invoke<[string, string][]>("parse_env_content", {
    text: item.text_content,
  });
  if (pairs.length === 0) return null;

  const totalSlots = pairs.length * 2;
  const sortKeys = generateNKeysBetween(beforeSort, afterSort, totalSlots);
  const now = Date.now().toString();
  const newItems: ClipboardItem[] = [];

  for (let i = 0; i < pairs.length; i++) {
    const [key, value] = pairs[i];

    try {
      const keyItem = await clipboardDb.insertItem({
        content_type: "text",
        text_content: key,
        image_data: null,
        image_width: null,
        image_height: null,
        char_count: key.length,
        line_count: 1,
        source_app: null,
        sort_order: sortKeys[i * 2],
        kv_key: null,
        detected_date: null,
        detected_color: null,
        created_at: now,
        updated_at: now,
      });
      newItems.push(keyItem);
    } catch (err) {
      console.error("Failed to insert split env key:", err);
    }

    try {
      const valueItem = await clipboardDb.insertItem({
        content_type: "text",
        text_content: value,
        image_data: null,
        image_width: null,
        image_height: null,
        char_count: value.length,
        line_count: value.split("\n").length,
        source_app: null,
        sort_order: sortKeys[i * 2 + 1],
        kv_key: key,
        detected_date: null,
        detected_color: null,
        created_at: now,
        updated_at: now,
      });
      newItems.push(valueItem);
    } catch (err) {
      console.error("Failed to insert split env value:", err);
    }
  }

  try {
    await clipboardDb.deleteItem(item.id);
  } catch (err) {
    console.error("Failed to delete original env item:", err);
  }

  return newItems;
}
