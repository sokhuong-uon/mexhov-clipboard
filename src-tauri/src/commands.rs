use crate::clipboard::ClipboardManager;
use crate::window_state::{is_visible as window_is_visible, set_visible as window_set_visible};
use tauri::PhysicalPosition;
use tauri::{AppHandle, Manager, State};

pub fn handle_command(app: &AppHandle, command: &str) {
    match command {
        "show" => {
            show_window_at_cursor(app.clone());
        }
        "hide" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
                window_set_visible(false);
            }
        }
        "toggle" => {
            if window_is_visible() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                    window_set_visible(false);
                }
            } else {
                show_window_at_cursor(app.clone());
            }
        }
        _ => {
            // Unknown command, default to show
            show_window_at_cursor(app.clone());
        }
    }
}

pub fn parse_command_from_args(args: &[String]) -> &str {
    // args[0] is typically the executable path
    // args[1] would be the command if provided
    args.get(1).map(|s| s.as_str()).unwrap_or("show")
}

#[tauri::command]
pub async fn read_clipboard(manager: State<'_, ClipboardManager>) -> Result<String, String> {
    manager.read().await
}

#[tauri::command]
pub async fn read_clipboard_image(
    manager: State<'_, ClipboardManager>,
) -> Result<Option<(String, u32, u32)>, String> {
    manager.read_image().await
}

#[tauri::command]
pub async fn write_clipboard(
    text: String,
    manager: State<'_, ClipboardManager>,
) -> Result<(), String> {
    manager.write(text).await
}

#[tauri::command]
pub async fn write_clipboard_image(
    base64_data: String,
    manager: State<'_, ClipboardManager>,
) -> Result<(), String> {
    manager.write_image(base64_data).await
}

#[tauri::command]
pub async fn reinitialize_clipboard(manager: State<'_, ClipboardManager>) -> Result<(), String> {
    manager.reinitialize()
}

#[tauri::command]
pub fn show_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        window_set_visible(true);
    }
}

#[tauri::command]
pub fn show_window_at_cursor(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        // Get window size for positioning calculations
        let window_size = window.inner_size().ok();
        let window_width = window_size.map(|s| s.width as f64).unwrap_or(400.0);
        let window_height = window_size.map(|s| s.height as f64).unwrap_or(300.0);

        // Get screen size from primary monitor
        let monitor = app.primary_monitor().ok().flatten();
        let screen_width = monitor
            .as_ref()
            .map(|m| m.size().width as f64)
            .unwrap_or(1920.0);
        let screen_height = monitor
            .as_ref()
            .map(|m| m.size().height as f64)
            .unwrap_or(1080.0);

        // Try to get cursor position (may fail or return (0,0) on Wayland)
        let (x, y) = if let Ok(cursor_pos) = app.cursor_position() {
            // On Wayland, cursor_position() may return Ok but with (0,0) which is invalid
            // Treat (0,0) as "unknown" and fall back to centering
            if cursor_pos.x == 0.0 && cursor_pos.y == 0.0 {
                let x = (screen_width - window_width) / 2.0;
                let y = (screen_height - window_height) / 2.0;
                (x.max(0.0), y.max(0.0))
            } else {
                // Position window near cursor (offset slightly to avoid covering it)
                // Center horizontally on cursor, offset vertically below cursor
                let mut x = cursor_pos.x - (window_width / 2.0);
                let mut y = cursor_pos.y + 20.0; // Small offset below cursor

                // Clamp to ensure window stays on screen
                x = x.max(0.0).min(screen_width - window_width);
                y = y.max(0.0).min(screen_height - window_height);

                (x, y)
            }
        } else {
            // Fallback: center the window on screen
            let x = (screen_width - window_width) / 2.0;
            let y = (screen_height - window_height) / 2.0;
            (x.max(0.0), y.max(0.0))
        };

        let _ = window.set_position(PhysicalPosition::new(x, y));
        // Ensure window is not minimized
        let _ = window.unminimize();
        // Temporarily set always on top to force window to front (helps on Wayland)
        let _ = window.set_always_on_top(true);
        let _ = window.show();
        let _ = window.set_focus();
        // Disable always on top after focusing
        let _ = window.set_always_on_top(false);
        // Update tracked state after showing window
        window_set_visible(true);
    }
}

#[tauri::command]
pub fn hide_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        window_set_visible(false);
    }
}

#[tauri::command]
pub fn toggle_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(visible) = window.is_visible() {
            if visible {
                let _ = window.hide();
                window_set_visible(false);
            } else {
                let _ = window.show();
                let _ = window.set_focus();
                window_set_visible(true);
            }
        }
    }
}

#[tauri::command]
pub fn is_wayland_session(manager: State<'_, ClipboardManager>) -> bool {
    manager.is_wayland()
}

#[tauri::command]
pub fn is_cosmic_data_control_enabled() -> bool {
    std::env::var("COSMIC_DATA_CONTROL_ENABLED")
        .map(|v| v == "1")
        .unwrap_or(false)
}

#[tauri::command]
pub fn get_system_theme() -> String {
    // Try gsettings (GNOME/COSMIC/GTK-based desktops)
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

    // Fallback: check GTK theme name for "dark" keyword
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
