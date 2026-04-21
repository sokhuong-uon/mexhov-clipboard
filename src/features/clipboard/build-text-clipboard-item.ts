import type { InsertClipboardItemParams } from "@/bindings";

export const buildTextClipboardItem = (
  text: string,
  sortOrder: string,
): InsertClipboardItemParams => {
  const now = Date.now().toString();
  return {
    content_type: "text",
    text_content: text,
    image_data: null,
    image_width: null,
    image_height: null,
    char_count: text.length,
    line_count: text.split("\n").length,
    source_app: null,
    sort_order: sortOrder,
    kv_key: null,
    created_at: now,
    updated_at: now,
  };
};
