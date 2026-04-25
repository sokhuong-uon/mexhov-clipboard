import type {
  ClipboardItem as ClipboardItemType,
  ClipboardContent,
} from "@/types/clipboard";

export const isItemCopied = (
  item: ClipboardItemType,
  content: ClipboardContent,
): boolean => {
  if (content.type === "text" && item.content_type === "text") {
    return item.text_content === content.text;
  }
  if (content.type === "image" && item.content_type === "image") {
    return item.image_data === content.base64Data;
  }
  return false;
};
