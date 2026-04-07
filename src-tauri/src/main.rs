// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod caret;
mod clipboard;
mod clipboard_monitor;
mod commands;
mod db;
mod detection;
mod schema;
mod sync;
mod tray;
mod window;

use clipboard::ClipboardManager;
use clipboard_monitor::MonitorState;
use commands::{create_command_builder, handle_command, parse_command_from_args};
use sync::SyncState;
use tauri::Manager;
use window::main_window;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let initial_command = parse_command_from_args(&args).to_string();

    let command_builder = create_command_builder();

    #[cfg(debug_assertions)]
    command_builder
        .export(
            specta_typescript::Typescript::default(),
            "../src/bindings.ts",
        )
        .expect("failed to export specta bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
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
            let database = db::initialization::init(app);
            app.manage(database);

            caret::init();
            tray::setup(app)?;
            main_window::setup(app, &initial_command);

            clipboard_monitor::start_monitor(app.handle());

            Ok(())
        })
        .invoke_handler(command_builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
