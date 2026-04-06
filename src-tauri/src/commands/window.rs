use crate::caret;
use crate::main_window;
use tauri::{AppHandle, Manager, PhysicalPosition};

#[tauri::command]
#[specta::specta]
pub fn show_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        main_window::set_visible(true);
    }
}

#[tauri::command]
#[specta::specta]
pub fn show_window_at_cursor(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let window_size = window.inner_size().ok();
        let window_width = window_size.map(|s| s.width as f64).unwrap_or(400.0);
        let window_height = window_size.map(|s| s.height as f64).unwrap_or(300.0);

        let monitor = app.primary_monitor().ok().flatten();
        let screen_width = monitor
            .as_ref()
            .map(|m| m.size().width as f64)
            .unwrap_or(1920.0);
        let screen_height = monitor
            .as_ref()
            .map(|m| m.size().height as f64)
            .unwrap_or(1080.0);

        let (x, y) = if let Some((cx, cy)) = caret::get_caret_position() {
            let mut x = cx - (window_width / 2.0);
            let mut y = cy + 4.0;

            if y + window_height > screen_height {
                y = (cy - window_height - 4.0).max(0.0);
            }

            x = x.max(0.0).min(screen_width - window_width);
            y = y.max(0.0).min(screen_height - window_height);
            (x, y)
        } else if let Ok(cursor_pos) = app.cursor_position() {
            if cursor_pos.x == 0.0 && cursor_pos.y == 0.0 {
                let x = (screen_width - window_width) / 2.0;
                let y = (screen_height - window_height) / 2.0;
                (x.max(0.0), y.max(0.0))
            } else {
                let mut x = cursor_pos.x - (window_width / 2.0);
                let mut y = cursor_pos.y + 20.0;

                x = x.max(0.0).min(screen_width - window_width);
                y = y.max(0.0).min(screen_height - window_height);
                (x, y)
            }
        } else {
            let x = (screen_width - window_width) / 2.0;
            let y = (screen_height - window_height) / 2.0;
            (x.max(0.0), y.max(0.0))
        };

        let _ = window.set_position(PhysicalPosition::new(x, y));
        let _ = window.unminimize();
        let _ = window.set_always_on_top(true);
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.set_always_on_top(false);
        main_window::set_visible(true);
    }
}

#[tauri::command]
#[specta::specta]
pub fn hide_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        main_window::set_visible(false);
    }
}

#[tauri::command]
#[specta::specta]
pub fn toggle_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(visible) = window.is_visible() {
            if visible {
                let _ = window.hide();
                main_window::set_visible(false);
            } else {
                let _ = window.show();
                let _ = window.set_focus();
                main_window::set_visible(true);
            }
        }
    }
}
