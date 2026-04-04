use drizzle::core::expr::*;
use drizzle::sqlite::prelude::*;
use sha2::{Digest, Sha256};

use crate::commands::detection::{color, date, env, secret};
use crate::schema::*;

use super::schema::*;
use super::utils::*;
use super::Database;

fn compute_content_hash(
    content_type: &str,
    text_content: &Option<String>,
    image_data: &Option<String>,
) -> String {
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

impl Database {
    pub fn get_all_items(
        &self,
        limit: i64,
        offset: i64,
        favorites_first: bool,
    ) -> DbResult<Vec<ClipboardItemRow>> {
        let inner = self.lock()?;

        let query = if favorites_first {
            "SELECT * FROM clipboard_items ORDER BY is_favorite DESC, sort_order ASC LIMIT ?1 OFFSET ?2"
        } else {
            "SELECT * FROM clipboard_items ORDER BY sort_order ASC LIMIT ?1 OFFSET ?2"
        };

        let rows: Vec<SelectClipboardItems> = inner
            .db
            .conn()
            .prepare(query)
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
                        is_env: row.get("is_env")?,
                        is_secret: row.get("is_secret")?,
                        content_hash: row.get("content_hash")?,
                        created_at: row.get("created_at")?,
                        updated_at: row.get("updated_at")?,
                    })
                })
                .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())
            })
            .map_err(error_to_string)?;

        Ok(rows.into_iter().map(ClipboardItemRow::from).collect())
    }

    pub fn insert_item(&self, params: InsertClipboardItemParams) -> DbResult<ClipboardItemRow> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        let content_hash = compute_content_hash(
            &params.content_type,
            &params.text_content,
            &params.image_data,
        );

        // Run all content detections on text
        let (detected_date, detected_color, is_env, is_secret) =
            if let Some(text) = &params.text_content {
                (
                    date::detect_date(text),
                    color::detect_color(text),
                    env::detect_env(text),
                    secret::detect_secret(text),
                )
            } else {
                (None, None, false, false)
            };

        inner
            .db
            .conn()
            .execute(
                "INSERT INTO clipboard_items (content_type, text_content, image_data, image_width, image_height, char_count, line_count, source_app, is_favorite, sort_order, copy_count, kv_key, detected_date, detected_color, is_env, is_secret, content_hash, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, 1, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
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
                    detected_date,
                    detected_color,
                    is_env as i64,
                    is_secret as i64,
                    content_hash,
                    params.created_at,
                    params.updated_at,
                ],
            )
            .map_err(error_to_string)?;

        let row: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .order_by(desc(ci.id))
            .limit(1)
            .get()
            .map_err(error_to_string)?;

        Ok(ClipboardItemRow::from(row))
    }

    /// Delete all duplicates of an item by content_hash, keeping only the given ID.
    pub fn delete_duplicates(&self, id: i64) -> DbResult<i64> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        let item: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .r#where(eq(ci.id, id))
            .get()
            .map_err(error_to_string)?;

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
            .map_err(error_to_string)?;

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
            .map_err(error_to_string)?;

        inner
            .db
            .conn()
            .execute(
                "UPDATE clipboard_items SET copy_count = copy_count + 1 WHERE id = ?1",
                rusqlite::params![id],
            )
            .map_err(error_to_string)?;

        let row: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .r#where(eq(ci.id, id))
            .get()
            .map_err(error_to_string)?;

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
            .map_err(error_to_string)?;

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
            .map_err(error_to_string)?;

        let new_fav = if current.is_favorite != 0 { 0i64 } else { 1i64 };

        inner
            .db
            .update(*ci)
            .set(UpdateClipboardItems::default().with_is_favorite(new_fav))
            .r#where(eq(ci.id, id))
            .execute()
            .map_err(error_to_string)?;

        let row: SelectClipboardItems = inner
            .db
            .select(())
            .from(*ci)
            .r#where(eq(ci.id, id))
            .get()
            .map_err(error_to_string)?;

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
            .map_err(error_to_string)?;

        Ok(())
    }

    pub fn clear_all(&self) -> DbResult<()> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        inner.db.delete(*ci).execute().map_err(error_to_string)?;

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
            .map_err(error_to_string)?;

        Ok(result.0)
    }
}
