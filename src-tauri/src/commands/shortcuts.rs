use tauri::AppHandle;

#[tauri::command]
#[specta::specta]
pub fn set_toggle_shortcut(app: AppHandle, accelerator: String) -> Result<(), String> {
    crate::shortcuts::apply(&app, &accelerator)
}
