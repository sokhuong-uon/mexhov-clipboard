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
    /// ISO 8601 date string when text content is detected as a date
    pub detected_date: Option<String>,
    /// CSS color value when text content is detected as a color
    pub detected_color: Option<String>,
    /// Whether text content looks like .env key-value pairs
    pub is_env: i64,
    /// Whether text content contains a detected secret (API key, token, etc.)
    pub is_secret: i64,
    /// User-provided annotation for the clipboard item
    pub note: Option<String>,
    /// SHA-256 hash of content for fast deduplication
    pub content_hash: Option<String>,
    /// MIME type when text_content is detected as a path to an existing file
    /// or directory (e.g. "application/pdf", "inode/directory")
    pub file_mime: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[SQLiteTable]
pub struct Settings {
    #[column(primary)]
    pub key: String,
    pub value: String,
}

#[derive(SQLiteSchema)]
pub struct Schema {
    pub clipboard_items: ClipboardItems,
    pub settings: Settings,
}
