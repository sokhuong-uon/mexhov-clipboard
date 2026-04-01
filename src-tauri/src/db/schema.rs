use serde::{Deserialize, Serialize};

use crate::schema::SelectClipboardItems;

pub type DbResult<T> = Result<T, String>;

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
    pub is_env: bool,
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
            is_env: row.is_env != 0,
            content_hash: row.content_hash,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
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
    pub is_env: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSortOrderParams {
    pub id: i64,
    pub sort_order: String,
}
