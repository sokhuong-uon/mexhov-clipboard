use drizzle::core::expr::*;
use drizzle::sqlite::prelude::*;

use crate::detection::{color, date, env, file, secret};
use crate::schema::*;

use super::super::schema::*;
use super::super::utils::*;
use super::super::Database;
use super::hash::compute_content_hash;

impl Database {
    pub fn insert_item(&self, params: InsertClipboardItemParams) -> DbResult<ClipboardItemRow> {
        let inner = self.lock()?;
        let ci = &inner.schema.clipboard_items;

        let content_hash = compute_content_hash(
            &params.content_type,
            &params.text_content,
            &params.image_data,
        );

        // Run all content detections on text
        let (detected_date, detected_color, is_env, is_secret, file_mime) =
            if let Some(text) = &params.text_content {
                let mime = file::detect_file_mime(text);
                // Path items should not be misclassified as env/secret/etc.
                if mime.is_some() {
                    (None, None, false, false, mime)
                } else {
                    (
                        date::detect_date(text),
                        color::detect(text),
                        env::detect_env(text),
                        secret::detect_secret(text),
                        None,
                    )
                }
            } else {
                (None, None, false, false, None)
            };

        inner
            .db
            .conn()
            .execute(
                "INSERT INTO clipboard_items (content_type, text_content, image_data, image_width, image_height, char_count, line_count, source_app, is_favorite, sort_order, copy_count, kv_key, detected_date, detected_color, is_env, is_secret, note, content_hash, file_mime, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, 1, ?10, ?11, ?12, ?13, ?14, NULL, ?15, ?16, ?17, ?18)",
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
                    file_mime,
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
}
