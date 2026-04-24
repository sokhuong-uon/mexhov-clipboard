use crate::handle_command;
use tauri::Manager;

use std::sync::atomic::{AtomicBool, Ordering};

static WINDOW_VISIBLE: AtomicBool = AtomicBool::new(false);

pub fn setup(app: &tauri::App, initial_command: &str) {
    if let Some(window) = app.get_webview_window("main") {
        handle_command(app.handle(), initial_command);

        let window_clone = window.clone();
        window.on_window_event(move |event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window_clone.hide();
                set_visible(false);
            }
            tauri::WindowEvent::Focused(focused) => {
                if *focused {
                    set_visible(true);
                } else {
                    let _ = window_clone.hide();
                    set_visible(false);
                }
            }
            _ => {}
        });
    }
}

pub fn set_visible(visible: bool) {
    WINDOW_VISIBLE.store(visible, Ordering::Relaxed);
}

pub fn is_visible() -> bool {
    WINDOW_VISIBLE.load(Ordering::Relaxed)
}
