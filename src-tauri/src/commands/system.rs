#[tauri::command]
#[specta::specta]
pub fn is_wayland_session() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
}

#[tauri::command]
#[specta::specta]
pub fn is_cosmic_data_control_enabled() -> bool {
    std::env::var("COSMIC_DATA_CONTROL_ENABLED")
        .map(|v| v == "1")
        .unwrap_or(false)
}
