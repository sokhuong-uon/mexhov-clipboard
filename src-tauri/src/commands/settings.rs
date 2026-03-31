use crate::db::Database;
use tauri::State;

#[tauri::command]
pub fn get_setting(key: String, database: State<'_, Database>) -> Result<Option<String>, String> {
    database.get_setting(&key)
}

#[tauri::command]
pub fn set_setting(
    key: String,
    value: String,
    database: State<'_, Database>,
) -> Result<(), String> {
    database.set_setting(&key, &value)
}
