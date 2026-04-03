// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod caret;
mod clipboard;
mod clipboard_monitor;
mod commands;
mod db;
mod schema;
mod sync;
mod tray;
mod window_state;

use clipboard::ClipboardManager;
use clipboard_monitor::MonitorState;
use commands::{
    convert_color, detect_color_content, detect_date_content, detect_env_content,
    download_media_to_temp, fetch_link_preview, get_file_size, get_setting, get_system_theme,
    handle_command, hide_window, is_cosmic_data_control_enabled, is_wayland_session,
    parse_command_from_args, parse_env_content, paste_item, read_clipboard, read_clipboard_image,
    reinitialize_clipboard, set_monitoring, set_setting, show_window, show_window_at_cursor,
    toggle_window, write_clipboard, write_clipboard_image,
};
use commands::{
    db_bump_item, db_clear_all, db_dedup_item, db_delete_item, db_get_all_items, db_get_item_count,
    db_insert_item, db_toggle_favorite, db_update_sort_orders,
};
use commands::{
    get_hostname, get_local_ip, get_network_interfaces, mdns_start_discovery, mdns_stop_discovery,
    sync_cloud_join, sync_connect, sync_start_server, sync_status, sync_stop,
};
use db::Database;
use sync::SyncState;
use tauri::Manager;
use window_state::set_visible as window_set_visible;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let initial_command = parse_command_from_args(&args).to_string();

    tauri::Builder::default()
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let command = parse_command_from_args(&args);
            handle_command(app, command);
        }))
        .manage(ClipboardManager::new())
        .manage(MonitorState::new())
        .manage(SyncState::new())
        .setup(move |app| {
            // Initialize database in app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
            let db_path = app_data_dir.join("clipboard.db");
            let database =
                Database::new(db_path.to_str().unwrap()).expect("failed to initialize database");
            app.manage(database);

            caret::init();
            tray::setup(app)?;
            setup_main_window(app, &initial_command);
            clipboard_monitor::start_monitor(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_window,
            show_window_at_cursor,
            hide_window,
            paste_item,
            toggle_window,
            read_clipboard,
            read_clipboard_image,
            write_clipboard,
            write_clipboard_image,
            reinitialize_clipboard,
            set_monitoring,
            is_wayland_session,
            is_cosmic_data_control_enabled,
            get_system_theme,
            db_get_all_items,
            db_insert_item,
            db_bump_item,
            db_delete_item,
            db_clear_all,
            db_toggle_favorite,
            db_update_sort_orders,
            db_get_item_count,
            db_dedup_item,
            detect_env_content,
            parse_env_content,
            detect_date_content,
            convert_color,
            detect_color_content,
            fetch_link_preview,
            download_media_to_temp,
            get_file_size,
            get_setting,
            set_setting,
            get_local_ip,
            get_hostname,
            get_network_interfaces,
            sync_start_server,
            sync_connect,
            sync_cloud_join,
            sync_stop,
            sync_status,
            mdns_start_discovery,
            mdns_stop_discovery,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_main_window(app: &tauri::App, initial_command: &str) {
    if let Some(window) = app.get_webview_window("main") {
        handle_command(app.handle(), initial_command);

        let window_clone = window.clone();
        window.on_window_event(move |event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window_clone.hide();
                window_set_visible(false);
            }
            tauri::WindowEvent::Focused(focused) => {
                if *focused {
                    window_set_visible(true);
                }
            }
            _ => {}
        });
    }
}
