use super::arboard::ArBoardClipboard;
use super::wayland;
use crate::commands::is_cosmic_data_control_enabled;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::Mutex;

fn is_wayland() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
}

/// Cached image result to avoid re-encoding unchanged images
struct ImageCache {
    hash: u64,
    base64_data: String,
    width: u32,
    height: u32,
}

fn hash_bytes(bytes: &[u8]) -> u64 {
    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    hasher.finish()
}

pub struct ClipboardManager {
    x11_clipboard: Option<ArBoardClipboard>,
    is_wayland: bool,
    _is_cosmic_data_control_enabled: bool,
    image_cache: Mutex<Option<ImageCache>>,
}

impl ClipboardManager {
    pub fn new() -> Self {
        let is_wayland = is_wayland();
        let is_cosmic_data_control_enabled = is_cosmic_data_control_enabled();

        Self {
            x11_clipboard: if is_wayland {
                None
            } else {
                Some(ArBoardClipboard::new())
            },
            is_wayland,
            _is_cosmic_data_control_enabled: is_cosmic_data_control_enabled,
            image_cache: Mutex::new(None),
        }
    }

    pub fn is_wayland(&self) -> bool {
        self.is_wayland
    }

    pub fn _is_cosmic_data_control_enabled(&self) -> bool {
        self._is_cosmic_data_control_enabled
    }

    pub async fn read(&self) -> Result<String, String> {
        if self.is_wayland {
            wayland::read().await
        } else {
            match &self.x11_clipboard {
                Some(clipboard) => clipboard.read().await,
                None => Err("X11 clipboard not initialized".to_string()),
            }
        }
    }

    /// Read image from clipboard and return as base64-encoded PNG with dimensions.
    /// Uses an internal cache to skip re-encoding when the image hasn't changed.
    /// Returns None if no image is available.
    pub async fn read_image(&self) -> Result<Option<(String, u32, u32)>, String> {
        if self.is_wayland {
            match wayland::read_image().await? {
                Some(png_bytes) => self.process_image_bytes_png(png_bytes),
                None => {
                    self.clear_image_cache();
                    Ok(None)
                }
            }
        } else {
            match &self.x11_clipboard {
                Some(clipboard) => match clipboard.read_image().await? {
                    Some((rgba_bytes, width, height)) => {
                        let hash = hash_bytes(&rgba_bytes);
                        if let Some(cached) = self.get_cached_image(hash) {
                            return Ok(Some(cached));
                        }

                        let png_bytes = encode_rgba_to_png(&rgba_bytes, width, height)
                            .map_err(|e| format!("Failed to encode image as PNG: {}", e))?;
                        let base64_data = BASE64.encode(&png_bytes);
                        self.set_image_cache(hash, base64_data.clone(), width, height);
                        Ok(Some((base64_data, width, height)))
                    }
                    None => {
                        self.clear_image_cache();
                        Ok(None)
                    }
                },
                None => Err("X11 clipboard not initialized".to_string()),
            }
        }
    }

    fn process_image_bytes_png(
        &self,
        png_bytes: Vec<u8>,
    ) -> Result<Option<(String, u32, u32)>, String> {
        let hash = hash_bytes(&png_bytes);
        if let Some(cached) = self.get_cached_image(hash) {
            return Ok(Some(cached));
        }

        let decoder = png::Decoder::new(std::io::Cursor::new(&png_bytes));
        let reader = decoder
            .read_info()
            .map_err(|e| format!("Failed to decode PNG: {}", e))?;
        let info = reader.info();
        let width = info.width;
        let height = info.height;

        let base64_data = BASE64.encode(&png_bytes);
        self.set_image_cache(hash, base64_data.clone(), width, height);
        Ok(Some((base64_data, width, height)))
    }

    fn get_cached_image(&self, hash: u64) -> Option<(String, u32, u32)> {
        let cache = self.image_cache.lock().ok()?;
        let cached = cache.as_ref()?;
        if cached.hash == hash {
            Some((cached.base64_data.clone(), cached.width, cached.height))
        } else {
            None
        }
    }

    fn set_image_cache(&self, hash: u64, base64_data: String, width: u32, height: u32) {
        if let Ok(mut cache) = self.image_cache.lock() {
            *cache = Some(ImageCache {
                hash,
                base64_data,
                width,
                height,
            });
        }
    }

    fn clear_image_cache(&self) {
        if let Ok(mut cache) = self.image_cache.lock() {
            *cache = None;
        }
    }

    pub async fn write(&self, text: String) -> Result<(), String> {
        if self.is_wayland {
            wayland::write(text).await
        } else {
            match &self.x11_clipboard {
                Some(clipboard) => clipboard.write(text).await,
                None => Err("X11 clipboard not initialized".to_string()),
            }
        }
    }

    /// Write image to clipboard from base64-encoded PNG
    pub async fn write_image(&self, base64_data: String) -> Result<(), String> {
        let png_bytes = BASE64
            .decode(&base64_data)
            .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

        if self.is_wayland {
            wayland::write_image(png_bytes).await
        } else {
            match &self.x11_clipboard {
                Some(clipboard) => {
                    // Decode PNG to RGBA for arboard
                    let (rgba_bytes, width, height) = decode_png_to_rgba(&png_bytes)
                        .map_err(|e| format!("Failed to decode PNG: {}", e))?;

                    clipboard.write_image(rgba_bytes, width, height).await
                }
                None => Err("X11 clipboard not initialized".to_string()),
            }
        }
    }

    pub fn reinitialize(&self) -> Result<(), String> {
        if self.is_wayland {
            Ok(())
        } else {
            match &self.x11_clipboard {
                Some(clipboard) => clipboard.reinitialize(),
                None => Err("X11 clipboard not initialized".to_string()),
            }
        }
    }
}

/// Encode RGBA bytes to PNG format
fn encode_rgba_to_png(rgba_bytes: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
    let mut png_bytes = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png_bytes, width, height);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);

        let mut writer = encoder
            .write_header()
            .map_err(|e| format!("Failed to write PNG header: {}", e))?;

        writer
            .write_image_data(rgba_bytes)
            .map_err(|e| format!("Failed to write PNG data: {}", e))?;
    }
    Ok(png_bytes)
}

/// Decode PNG bytes to RGBA format with dimensions
fn decode_png_to_rgba(png_bytes: &[u8]) -> Result<(Vec<u8>, u32, u32), String> {
    let decoder = png::Decoder::new(std::io::Cursor::new(png_bytes));
    let mut reader = decoder
        .read_info()
        .map_err(|e| format!("Failed to read PNG info: {}", e))?;

    let mut buf = vec![0; reader.output_buffer_size()];
    let info = reader
        .next_frame(&mut buf)
        .map_err(|e| format!("Failed to decode PNG frame: {}", e))?;

    let width = info.width;
    let height = info.height;

    // Ensure we have RGBA data
    let rgba_bytes = match info.color_type {
        png::ColorType::Rgba => buf[..info.buffer_size()].to_vec(),
        png::ColorType::Rgb => {
            // Convert RGB to RGBA
            let rgb_data = &buf[..info.buffer_size()];
            let mut rgba = Vec::with_capacity((width * height * 4) as usize);
            for chunk in rgb_data.chunks(3) {
                rgba.push(chunk[0]);
                rgba.push(chunk[1]);
                rgba.push(chunk[2]);
                rgba.push(255);
            }
            rgba
        }
        png::ColorType::Grayscale => {
            let gray_data = &buf[..info.buffer_size()];
            let mut rgba = Vec::with_capacity((width * height * 4) as usize);
            for &g in gray_data {
                rgba.push(g);
                rgba.push(g);
                rgba.push(g);
                rgba.push(255);
            }
            rgba
        }
        png::ColorType::GrayscaleAlpha => {
            let ga_data = &buf[..info.buffer_size()];
            let mut rgba = Vec::with_capacity((width * height * 4) as usize);
            for chunk in ga_data.chunks(2) {
                rgba.push(chunk[0]);
                rgba.push(chunk[0]);
                rgba.push(chunk[0]);
                rgba.push(chunk[1]);
            }
            rgba
        }
        png::ColorType::Indexed => {
            return Err("Indexed PNG not supported".to_string());
        }
    };

    Ok((rgba_bytes, width, height))
}
