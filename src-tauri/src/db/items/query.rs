use crate::schema::*;

use super::super::schema::*;
use super::super::utils::*;
use super::super::Database;

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
                        note: row.get("note")?,
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
}
