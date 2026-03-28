// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod clipboard;
mod commands;
mod tray;
mod window_state;

use clipboard::ClipboardManager;
use commands::{
    get_system_theme, handle_command, hide_window, is_cosmic_data_control_enabled,
    is_wayland_session, parse_command_from_args, read_clipboard, read_clipboard_image,
    reinitialize_clipboard, show_window, show_window_at_cursor, toggle_window, write_clipboard,
    write_clipboard_image,
};
use tauri::Manager;
use window_state::set_visible as window_set_visible;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let initial_command = parse_command_from_args(&args).to_string();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let command = parse_command_from_args(&args);
            handle_command(app, command);
        }))
        .manage(ClipboardManager::new())
        .setup(move |app| {
            tray::setup(app)?;
            setup_main_window(app, &initial_command);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_window,
            show_window_at_cursor,
            hide_window,
            toggle_window,
            read_clipboard,
            read_clipboard_image,
            write_clipboard,
            write_clipboard_image,
            reinitialize_clipboard,
            is_wayland_session,
            is_cosmic_data_control_enabled,
            get_system_theme
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
