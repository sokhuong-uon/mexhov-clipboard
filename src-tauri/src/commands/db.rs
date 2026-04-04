use crate::db::{ClipboardItemRow, Database, InsertClipboardItemParams, UpdateSortOrderParams};
use tauri::State;

#[tauri::command]
pub fn db_get_all_items(
    limit: i64,
    offset: i64,
    favorites_first: bool,
    database: State<'_, Database>,
) -> Result<Vec<ClipboardItemRow>, String> {
    database.get_all_items(limit, offset, favorites_first)
}

#[tauri::command]
pub fn db_insert_item(
    params: InsertClipboardItemParams,
    database: State<'_, Database>,
) -> Result<ClipboardItemRow, String> {
    database.insert_item(params)
}

#[tauri::command]
pub fn db_bump_item(
    id: i64,
    sort_order: String,
    database: State<'_, Database>,
) -> Result<ClipboardItemRow, String> {
    database.bump_item(id, &sort_order)
}

#[tauri::command]
pub fn db_delete_item(id: i64, database: State<'_, Database>) -> Result<(), String> {
    database.delete_item(id)
}

#[tauri::command]
pub fn db_clear_all(database: State<'_, Database>) -> Result<(), String> {
    database.clear_all()
}

#[tauri::command]
pub fn db_toggle_favorite(
    id: i64,
    database: State<'_, Database>,
) -> Result<ClipboardItemRow, String> {
    database.toggle_favorite(id)
}

#[tauri::command]
pub fn db_update_sort_orders(
    items: Vec<UpdateSortOrderParams>,
    database: State<'_, Database>,
) -> Result<(), String> {
    database.update_sort_orders(items)
}

#[tauri::command]
pub fn db_get_item_count(database: State<'_, Database>) -> Result<i64, String> {
    database.get_item_count()
}

#[tauri::command]
pub fn db_dedup_item(id: i64, database: State<'_, Database>) -> Result<i64, String> {
    database.delete_duplicates(id)
}

#[tauri::command]
pub fn db_update_note(
    id: i64,
    note: Option<String>,
    database: State<'_, Database>,
) -> Result<ClipboardItemRow, String> {
    database.update_note(id, note.as_deref())
}
