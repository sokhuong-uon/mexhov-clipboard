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

#[tauri::command]
#[specta::specta]
pub fn get_system_theme() -> String {
    if let Ok(output) = std::process::Command::new("gsettings")
        .args(["get", "org.gnome.desktop.interface", "color-scheme"])
        .output()
    {
        let value = String::from_utf8_lossy(&output.stdout);
        if value.contains("prefer-dark") {
            return "dark".to_string();
        } else if value.contains("prefer-light") || value.contains("default") {
            return "light".to_string();
        }
    }

    if let Ok(output) = std::process::Command::new("gsettings")
        .args(["get", "org.gnome.desktop.interface", "gtk-theme"])
        .output()
    {
        let value = String::from_utf8_lossy(&output.stdout).to_lowercase();
        if value.contains("dark") {
            return "dark".to_string();
        }
    }

    "light".to_string()
}
