mod items;
mod schema;
mod settings;
mod utils;

pub use schema::*;
pub(crate) use utils::*;

use std::sync::Mutex;

use drizzle::sqlite::rusqlite::Drizzle;
use rusqlite::Connection;

use crate::schema::Schema;

pub struct Database {
    inner: Mutex<DatabaseInner>,
}

struct DatabaseInner {
    db: Drizzle,
    schema: Schema,
}

impl Database {
    pub fn new(db_path: &str) -> DbResult<Self> {
        let conn = Connection::open(db_path).map_err(error_to_string)?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(error_to_string)?;

        let (db, _) = Drizzle::new(conn, ());
        let schema = Schema::new();
        db.push(&schema).map_err(error_to_string)?;

        db.conn()
            .execute(
                "CREATE INDEX IF NOT EXISTS idx_clipboard_items_content_hash ON clipboard_items(content_hash)",
                [],
            )
            .map_err(error_to_string)?;

        let schema = Schema::new();
        let inner = DatabaseInner { db, schema };
        Ok(Self {
            inner: Mutex::new(inner),
        })
    }

    fn lock(&self) -> DbResult<std::sync::MutexGuard<'_, DatabaseInner>> {
        self.inner.lock().map_err(error_to_string)
    }
}
