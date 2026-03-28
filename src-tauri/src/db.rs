use std::sync::Mutex;

use drizzle::core::expr::*;
use drizzle::sqlite::prelude::*;
use drizzle::sqlite::rusqlite::Drizzle;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::schema::*;

type DbResult<T> = Result<T, String>;

fn e2s<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClipboardItemRow {
    pub id: i64,
    pub content_type: String,
    pub text_content: Option<String>,
    pub image_data: Option<String>,
    pub image_width: Option<i64>,
    pub image_height: Option<i64>,
    pub char_count: Option<i64>,
    pub line_count: Option<i64>,
    pub source_app: Option<String>,
    pub is_favorite: bool,
    pub sort_order: String,
    pub copy_count: i64,
    pub kv_key: Option<String>,
    pub detected_date: Option<String>,
    pub detected_color: Option<String>,
    pub content_hash: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<SelectClipboardItems> for ClipboardItemRow {
    fn from(row: SelectClipboardItems) -> Self {
        Self {
            id: row.id,
            content_type: row.content_type,
            text_content: row.text_content,
            image_data: row.image_data,
            image_width: row.image_width,
            image_height: row.image_height,
            char_count: row.char_count,
            line_count: row.line_count,
            source_app: row.source_app,
            is_favorite: row.is_favorite != 0,
            sort_order: row.sort_order,
            copy_count: row.copy_count,
            kv_key: row.kv_key,
            detected_date: row.detected_date,
            detected_color: row.detected_color,
            content_hash: row.content_hash,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

fn compute_content_hash(content_type: &str, text_content: &Option<String>, image_data: &Option<String>) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content_type.as_bytes());
    hasher.update(b":");
    match content_type {
        "text" => {
            if let Some(text) = text_content {
                hasher.update(text.as_bytes());
            }
        }
        "image" => {
            if let Some(data) = image_data {
                hasher.update(data.as_bytes());
            }
        }
        _ => {}
    }
    format!("{:x}", hasher.finalize())
}

#[derive(Debug, Deserialize)]
pub struct InsertClipboardItemParams {
    pub content_type: String,
    pub text_content: Option<String>,
    pub image_data: Option<String>,
    pub image_width: Option<i64>,
    pub image_height: Option<i64>,
    pub char_count: Option<i64>,
    pub line_count: Option<i64>,
    pub source_app: Option<String>,
    pub sort_order: String,
    pub kv_key: Option<String>,
    pub detected_date: Option<String>,
    pub detected_color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSortOrderParams {
    pub id: i64,
    pub sort_order: String,
}

pub struct Database {
    inner: Mutex<DatabaseInner>,
}

struct DatabaseInner {
    db: Drizzle,
    schema: Schema,
}

impl Database {
    pub fn new(db_path: &str) -> DbResult<Self> {
        let conn = Connection::open(db_path).map_err(e2s)?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(e2s)?;

        // Use push to create/migrate tables
        let (db, _) = Drizzle::new(conn, ());
        let schema = Schema::new();
        db.push(&schema).map_err(e2s)?;

        // Create index on content_hash for fast deduplication
        db.conn().execute(
            "CREATE INDEX IF NOT EXISTS idx_clipboard_items_content_hash ON clipboard_items(content_hash)",
            [],
        ).map_err(e2s)?;

        let schema = Schema::new();
        let inner = DatabaseInner { db, schema };
        Ok(Self {
            inner: Mutex::new(inner),
        })
    }

    fn lock(&self) -> DbResult<std::sync::MutexGuard<'_, DatabaseInner>> {
        self.inner.lock().map_err(e2s)
    }

    pub fn get_all_items(&self, limit: i64, offset: i64) -> DbResult<Vec<ClipboardItemRow>> {
        let inner = self.lock()?;
        let _ci = &inner.schema.clipboard_items;

        let rows: Vec<SelectClipboardItems> = inner
            .db
            .conn()
            .prepare("SELECT * FROM clipboard_items ORDER BY sort_order ASC LIMIT ?1 OFFSET ?2")
            .and_then(|mut stmt| {
                stmt.query_map(rusqlite::params![limit, offset], |row| {
                    Ok(SelectClipboardItems {
                        id: row.get("id")?,
                        content_type: row.get("content_type")?,
                        text_content: row.get("text_content")?,
                        image_data: row.get("image_data")?,
                        image_width: row.get("image_width")?,
                        image_height: row.get("image_height")?,
                        char_count: row.get("char_count")?,
                        line_count: row.get("line_count")?,
                        source_app: row.get("source_app")?,
                        is_favorite: row.get("is_favorite")?,
                        sort_order: row.get("sort_order")?,
                        copy_count: row.get("copy_count")?,
                        kv_key: row.get("kv_key")?,
                        detected_date: row.get("detected_date")?,
                        detected_color: row.get("detected_color")?,
                        content_hash: row.get("content_hash")?,
                        created_at: row.get("created_at")?,
                        updated_at: row.get("updated_at")?,
                    })
                })
                .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())
            })
            .map_err(e2s)?;

        Ok(rows.into_iter().map(ClipboardItemRow::from).collect())
    }

    pub fn insert_item(&self, params: InsertClipboardItemParams) -> DbResult<ClipboardItemRow> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        let content_hash = compute_content_hash(&params.content_type, &params.text_content, &params.image_data);

        inner
            .db
            .conn()
            .execute(
                "INSERT INTO clipboard_items (content_type, text_content, image_data, image_width, image_height, char_count, line_count, source_app, is_favorite, sort_order, copy_count, kv_key, detected_date, detected_color, content_hash, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, 1, ?10, ?11, ?12, ?13, ?14, ?15)",
                rusqlite::params![
                    params.content_type,
                    params.text_content,
                    params.image_data,
                    params.image_width,
                    params.image_height,
                    params.char_count,
                    params.line_count,
                    params.source_app,
                    params.sort_order,
                    params.kv_key,
                    params.detected_date,
                    params.detected_color,
                    content_hash,
                    params.created_at,
                    params.updated_at,
                ],
            )
            .map_err(e2s)?;

        let row: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .order_by(desc(ci.id))
            .limit(1)
            .get()
            .map_err(e2s)?;

        Ok(ClipboardItemRow::from(row))
    }

    /// Delete all duplicates of an item by content_hash, keeping only the given ID.
    /// Returns the number of deleted rows.
    pub fn delete_duplicates(&self, id: i64) -> DbResult<i64> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        // Get the item's content_hash
        let item: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .r#where(eq(ci.id, id))
            .get()
            .map_err(e2s)?;

        let Some(hash) = item.content_hash else {
            return Ok(0);
        };

        let deleted = inner
            .db
            .conn()
            .execute(
                "DELETE FROM clipboard_items WHERE content_hash = ?1 AND id != ?2",
                rusqlite::params![hash, id],
            )
            .map_err(e2s)?;

        Ok(deleted as i64)
    }

    pub fn bump_item(&self, id: i64, sort_order: &str) -> DbResult<ClipboardItemRow> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        let now = timestamp_now();

        inner
            .db
            .update(*ci)
            .set(
                UpdateClipboardItems::default()
                    .with_sort_order(sort_order)
                    .with_updated_at(&now),
            )
            .r#where(eq(ci.id, id))
            .execute()
            .map_err(e2s)?;

        inner
            .db
            .conn()
            .execute(
                "UPDATE clipboard_items SET copy_count = copy_count + 1 WHERE id = ?1",
                rusqlite::params![id],
            )
            .map_err(e2s)?;

        let row: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .r#where(eq(ci.id, id))
            .get()
            .map_err(e2s)?;

        Ok(ClipboardItemRow::from(row))
    }

    pub fn update_sort_order(&self, id: i64, sort_order: &str) -> DbResult<()> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        inner
            .db
            .update(*ci)
            .set(UpdateClipboardItems::default().with_sort_order(sort_order))
            .r#where(eq(ci.id, id))
            .execute()
            .map_err(e2s)?;

        Ok(())
    }

    pub fn update_sort_orders(&self, items: Vec<UpdateSortOrderParams>) -> DbResult<()> {
        for item in items {
            self.update_sort_order(item.id, &item.sort_order)?;
        }
        Ok(())
    }

    pub fn toggle_favorite(&self, id: i64) -> DbResult<ClipboardItemRow> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        let current: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .r#where(eq(ci.id, id))
            .get()
            .map_err(e2s)?;

        let new_fav = if current.is_favorite != 0 { 0i64 } else { 1i64 };

        inner
            .db
            .update(*ci)
            .set(UpdateClipboardItems::default().with_is_favorite(new_fav))
            .r#where(eq(ci.id, id))
            .execute()
            .map_err(e2s)?;

        let row: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .r#where(eq(ci.id, id))
            .get()
            .map_err(e2s)?;

        Ok(ClipboardItemRow::from(row))
    }

    pub fn delete_item(&self, id: i64) -> DbResult<()> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        inner
            .db
            .delete(*ci)
            .r#where(eq(ci.id, id))
            .execute()
            .map_err(e2s)?;

        Ok(())
    }

    pub fn clear_all(&self) -> DbResult<()> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        inner.db.delete(*ci).execute().map_err(e2s)?;

        Ok(())
    }

    pub fn get_item_count(&self) -> DbResult<i64> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        let result: (i64,) = inner
            .db
            .select((count(ci.id),))
            .from(*ci)
            .get()
            .map_err(e2s)?;

        Ok(result.0)
    }

    pub fn get_setting(&self, key: &str) -> DbResult<Option<String>> {
        let inner = self.lock()?;
        let s = &inner.schema.settings;

        let rows: Vec<SelectSettings> = inner
            .db
            .select(())
            .from(*s)
            .r#where(eq(s.key, key))
            .limit(1)
            .all()
            .map_err(e2s)?;

        Ok(rows.into_iter().next().map(|r| r.value))
    }

    pub fn set_setting(&self, key: &str, value: &str) -> DbResult<()> {
        let inner = self.lock()?;

        // Upsert via raw SQL since drizzle may not support ON CONFLICT
        inner
            .db
            .conn()
            .execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
                rusqlite::params![key, value],
            )
            .map_err(e2s)?;

        Ok(())
    }
}

fn timestamp_now() -> String {
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_millis())
}
