import { invoke } from "@tauri-apps/api/core";
import { ClipboardItem } from "@/types/clipboard";

type InsertParams = {
  content_type: string;
  text_content: string | null;
  image_data: string | null;
  image_width: number | null;
  image_height: number | null;
  char_count: number | null;
  line_count: number | null;
  source_app: string | null;
  sort_order: string;
  kv_key: string | null;
  created_at: string;
  updated_at: string;
};

type UpdateSortOrderParams = {
  id: number;
  sort_order: string;
};

export const clipboardDb = {
  getAllItems: (limit: number, offset = 0, favoritesFirst = false) =>
    invoke<ClipboardItem[]>("db_get_all_items", { limit, offset, favoritesFirst }),

  getItemCount: () => invoke<number>("db_get_item_count"),

  insertItem: (params: InsertParams) =>
    invoke<ClipboardItem>("db_insert_item", { params }),

  bumpItem: (id: number, sortOrder: string) =>
    invoke<ClipboardItem>("db_bump_item", { id, sort_order: sortOrder }),

  deleteItem: (id: number) => invoke<void>("db_delete_item", { id }),

  clearAll: () => invoke<void>("db_clear_all"),

  toggleFavorite: (id: number) =>
    invoke<ClipboardItem>("db_toggle_favorite", { id }),

  updateSortOrders: (items: UpdateSortOrderParams[]) =>
    invoke<void>("db_update_sort_orders", { items }),

  dedupItem: (id: number) => invoke<number>("db_dedup_item", { id }),
};
