mod clipboard;
mod db;
mod media;
mod settings;
mod shortcuts;
mod sync;
mod system;
mod window;

pub use clipboard::*;
pub use db::*;
pub use media::*;
pub use settings::*;
pub use shortcuts::*;
pub use sync::*;
pub use system::*;
pub use window::*;

use crate::main_window;
use tauri::{AppHandle, Manager};
use tauri_specta::{collect_commands, Builder};

pub fn create_command_builder() -> Builder<tauri::Wry> {
    Builder::new().commands(collect_commands![
        paste_item,
        paste_file_uri,
        read_clipboard,
        read_clipboard_image,
        write_clipboard,
        write_clipboard_image,
        reinitialize_clipboard,
        parse_env_content,
        set_monitoring,
        is_wayland_session,
        is_cosmic_data_control_enabled,
        db_get_all_items,
        db_insert_item,
        db_bump_item,
        db_delete_item,
        db_clear_all,
        db_toggle_favorite,
        db_update_sort_orders,
        db_dedup_item,
        db_update_note,
        fetch_link_preview,
        download_media_to_temp,
        get_setting,
        set_setting,
        get_hostname,
        get_network_interfaces,
        sync_start_server,
        sync_connect,
        sync_cloud_join,
        sync_stop,
        mdns_start_discovery,
        mdns_stop_discovery,
        set_toggle_shortcut,
    ])
}

pub fn handle_command(app: &AppHandle, command: &str) {
    match command {
        "show" => {
            show_window_at_cursor(app.clone());
        }
        "hide" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
                main_window::set_visible(false);
            }
        }
        "toggle" => {
            if main_window::is_visible() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                    main_window::set_visible(false);
                }
            } else {
                show_window_at_cursor(app.clone());
            }
        }
        _ => {}
    }
}

pub fn parse_command_from_args(args: &[String]) -> &str {
    args.get(1).map(|s| s.as_str()).unwrap_or("")
}
