use super::arboard::ArBoardClipboard;
use super::image::{self, ImageCache};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

pub struct ClipboardManager {
    clipboard: ArBoardClipboard,
    image_cache: ImageCache,
}

impl ClipboardManager {
    pub fn new() -> Self {
        Self {
            clipboard: ArBoardClipboard::new(),
            image_cache: ImageCache::new(),
        }
    }

    pub async fn read(&self) -> Result<String, String> {
        self.clipboard.read().await
    }

    /// Read image from clipboard and return as base64-encoded PNG with dimensions.
    /// Uses an internal cache to skip re-encoding when the image hasn't changed.
    /// Returns None if no image is available.
    pub async fn read_image(&self) -> Result<Option<(String, u32, u32)>, String> {
        match self.clipboard.read_image().await? {
            Some((rgba_bytes, width, height)) => {
                let hash = image::hash_bytes(&rgba_bytes);
                if let Some(cached) = self.image_cache.get(hash) {
                    return Ok(Some(cached));
                }

                let png_bytes = image::encode_rgba_to_png(&rgba_bytes, width, height)
                    .map_err(|e| format!("Failed to encode image as PNG: {}", e))?;
                let base64_data = BASE64.encode(&png_bytes);
                self.image_cache.set(hash, base64_data.clone(), width, height);
                Ok(Some((base64_data, width, height)))
            }
            None => {
                self.image_cache.clear();
                Ok(None)
            }
        }
    }

    pub async fn write(&self, text: String) -> Result<(), String> {
        self.clipboard.write(text).await
    }

    /// Write image to clipboard from base64-encoded PNG
    pub async fn write_image(&self, base64_data: String) -> Result<(), String> {
        let png_bytes = BASE64
            .decode(&base64_data)
            .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

        let (rgba_bytes, width, height) =
            image::decode_png_to_rgba(&png_bytes).map_err(|e| format!("Failed to decode PNG: {}", e))?;

        self.clipboard.write_image(rgba_bytes, width, height).await
    }

    pub fn reinitialize(&self) -> Result<(), String> {
        self.clipboard.reinitialize()
    }
}
