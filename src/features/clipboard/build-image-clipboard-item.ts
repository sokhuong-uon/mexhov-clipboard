import type { InsertClipboardItemParams } from "@/bindings";

export const buildImageClipboardItem = (
  base64Data: string,
  width: number,
  height: number,
  sortOrder: string,
): InsertClipboardItemParams => {
  const now = Date.now().toString();
  return {
    content_type: "image",
    text_content: null,
    image_data: base64Data,
    image_width: width,
    image_height: height,
    char_count: null,
    line_count: null,
    source_app: null,
    sort_order: sortOrder,
    kv_key: null,
    created_at: now,
    updated_at: now,
  };
};
