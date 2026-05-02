// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod caret;
mod clipboard;
mod clipboard_monitor;
mod cloud;
mod commands;
mod crypto;
mod db;
mod detection;
mod schema;
mod shortcuts;
mod sync;
mod tray;
mod window;

use clipboard::ClipboardManager;
use clipboard_monitor::MonitorState;
use commands::{create_command_builder, handle_command, parse_command_from_args};
use sync::SyncState;
use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_notification::NotificationExt;
use window::main_window;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let initial_command = parse_command_from_args(&args).to_string();

    let command_builder = create_command_builder();

    #[cfg(debug_assertions)]
    command_builder
        .export(
            specta_typescript::Typescript::default(),
            concat!(env!("CARGO_MANIFEST_DIR"), "/../src/bindings.ts"),
        )
        .expect("failed to export specta bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let command = parse_command_from_args(&args);
            handle_command(app, command);
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    shortcuts::on_event(app, shortcut, event);
                })
                .build(),
        )
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_opener::init())
        .manage(ClipboardManager::new())
        .manage(MonitorState::new())
        .manage(SyncState::new())
        .manage(shortcuts::ToggleShortcut::default())
        .setup(move |app| {
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            app.deep_link().register_all()?;

            commands::init_keyring().expect("failed to initialize keyring store");

            let database = db::initialization::init(app);
            app.manage(database);

            caret::init();
            tray::setup(app)?;
            main_window::setup(app, &initial_command);

            clipboard_monitor::start_monitor(app.handle());

            shortcuts::register(app.handle());

            let start_urls = app.deep_link().get_current()?;
            if let Some(urls) = start_urls {
                // app was likely started by a deep link
                println!("deep link URLs: {:?}", urls);
            }

            let app_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls();

                println!("deep link URLs: {:?}", urls);
                if let Some(url) = urls.first() {
                    let _ = app_handle
                        .notification()
                        .builder()
                        .title("Mexboard")
                        .body(format!("Authentication received: {}", url))
                        .show();
                }
            });

            Ok(())
        })
        .invoke_handler(command_builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
