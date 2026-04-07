use crate::db::Database;
use tauri::{App, Manager};

pub fn init(app: &App) -> Database {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("db:init: failed to resolve app data dir");

    std::fs::create_dir_all(&app_data_dir).expect("db:init: failed to create app data dir");

    let db_path = app_data_dir.join("clipboard.db");

    let database =
        Database::new(db_path.to_str().unwrap()).expect("db:init: failed to initialize database");

    return database;
}
