import { commands, InsertClipboardItemParams, UpdateSortOrderParams } from "@/bindings";
import { ClipboardItem } from "@/types/clipboard";

async function unwrap<T>(
  p: Promise<{ status: "ok"; data: T } | { status: "error"; error: string }>,
): Promise<T> {
  const r = await p;
  if (r.status === "error") throw r.error;
  return r.data;
}

export const clipboardDb = {
  getAllItems: (limit: number, offset = 0, favoritesFirst = false) =>
    unwrap(commands.dbGetAllItems(limit, offset, favoritesFirst)) as Promise<
      ClipboardItem[]
    >,

  getItemCount: () => unwrap(commands.dbGetItemCount()),

  insertItem: (params: InsertClipboardItemParams) =>
    unwrap(commands.dbInsertItem(params)) as Promise<ClipboardItem>,

  bumpItem: (id: number, sortOrder: string) =>
    unwrap(commands.dbBumpItem(id, sortOrder)) as Promise<ClipboardItem>,

  deleteItem: (id: number) => unwrap(commands.dbDeleteItem(id)),

  clearAll: () => unwrap(commands.dbClearAll()),

  toggleFavorite: (id: number) =>
    unwrap(commands.dbToggleFavorite(id)) as Promise<ClipboardItem>,

  updateSortOrders: (items: UpdateSortOrderParams[]) =>
    unwrap(commands.dbUpdateSortOrders(items)),

  dedupItem: (id: number) => unwrap(commands.dbDedupItem(id)),

  updateNote: (id: number, note: string | null) =>
    unwrap(commands.dbUpdateNote(id, note)) as Promise<ClipboardItem>,
};
