use drizzle::sqlite::prelude::*;

#[SQLiteTable]
pub struct ClipboardItems {
    #[column(primary, autoincrement)]
    pub id: i64,
    /// "text" or "image"
    pub content_type: String,
    pub text_content: Option<String>,
    pub image_data: Option<String>,
    pub image_width: Option<i64>,
    pub image_height: Option<i64>,
    pub char_count: Option<i64>,
    pub line_count: Option<i64>,
    pub source_app: Option<String>,
    pub is_favorite: i64,
    /// Fractional index string for drag-and-drop ordering
    pub sort_order: String,
    pub copy_count: i64,
    /// Key name when this item was split from a key-value pair
    pub kv_key: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(SQLiteSchema)]
pub struct Schema {
    pub clipboard_items: ClipboardItems,
}
