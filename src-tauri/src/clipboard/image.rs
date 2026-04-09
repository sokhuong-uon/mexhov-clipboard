use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::Mutex;

pub struct ImageCache {
    inner: Mutex<Option<CachedImage>>,
}

struct CachedImage {
    hash: u64,
    base64_data: String,
    width: u32,
    height: u32,
}

impl ImageCache {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    pub fn get(&self, hash: u64) -> Option<(String, u32, u32)> {
        let cache = self.inner.lock().ok()?;
        let cached = cache.as_ref()?;
        if cached.hash == hash {
            Some((cached.base64_data.clone(), cached.width, cached.height))
        } else {
            None
        }
    }

    pub fn set(&self, hash: u64, base64_data: String, width: u32, height: u32) {
        if let Ok(mut cache) = self.inner.lock() {
            *cache = Some(CachedImage {
                hash,
                base64_data,
                width,
                height,
            });
        }
    }

    pub fn clear(&self) {
        if let Ok(mut cache) = self.inner.lock() {
            *cache = None;
        }
    }
}

pub fn hash_bytes(bytes: &[u8]) -> u64 {
    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    hasher.finish()
}

pub fn encode_rgba_to_png(rgba_bytes: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
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

pub fn decode_png_to_rgba(png_bytes: &[u8]) -> Result<(Vec<u8>, u32, u32), String> {
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

    let rgba_bytes = match info.color_type {
        png::ColorType::Rgba => buf[..info.buffer_size()].to_vec(),
        png::ColorType::Rgb => {
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
