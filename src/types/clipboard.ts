export type ClipboardItemType = "text" | "image";

export type ClipboardItem = {
  id: number;
  content_type: ClipboardItemType;
  text_content: string | null;
  image_data: string | null;
  image_width: number | null;
  image_height: number | null;
  char_count: number | null;
  line_count: number | null;
  source_app: string | null;
  is_favorite: boolean;
  sort_order: string;
  copy_count: number;
  kv_key: string | null;
  created_at: string;
  updated_at: string;
  is_env?: boolean;
};

export type ClipboardError = {
  id: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
};

export type SystemInfo = {
  isWayland: boolean;
  isCosmicDataControlEnabled: boolean;
};

// Type for clipboard content read from backend
export type ClipboardContent =
  | { type: "text"; text: string }
  | { type: "image"; base64Data: string; width: number; height: number }
  | { type: "empty" };
