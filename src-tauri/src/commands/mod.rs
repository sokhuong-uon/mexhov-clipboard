mod clipboard;
mod db;
mod detection;
mod media;
mod settings;
mod sync;
mod system;
mod window;

pub use clipboard::*;
pub use db::*;
pub use detection::*;
pub use media::*;
pub use settings::*;
pub use sync::*;
pub use system::*;
pub use window::*;

use crate::window_state::{is_visible as window_is_visible, set_visible as window_set_visible};
use tauri::{AppHandle, Manager};

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
            show_window_at_cursor(app.clone());
        }
    }
}

pub fn parse_command_from_args(args: &[String]) -> &str {
    args.get(1).map(|s| s.as_str()).unwrap_or("show")
}
