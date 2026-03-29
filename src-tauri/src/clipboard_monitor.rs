use crate::clipboard::ClipboardManager;
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};
use tokio::time::{interval, Duration};

#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum ClipboardChangeEvent {
    Text { text: String },
    Image { base64_data: String, width: u32, height: u32 },
}

pub struct MonitorState {
    pub is_monitoring: AtomicBool,
}

impl MonitorState {
    pub fn new() -> Self {
        Self {
            is_monitoring: AtomicBool::new(true),
        }
    }
}

pub fn start_monitor(app: &AppHandle) {
    let handle = app.clone();

    tauri::async_runtime::spawn(async move {
        let manager = handle.state::<ClipboardManager>();
        let monitor_state = handle.state::<MonitorState>();
        let is_wayland = manager.is_wayland();
        let poll_ms = if is_wayland { 500 } else { 750 };

        let mut ticker = interval(Duration::from_millis(poll_ms));
        let mut prev_text: Option<String> = None;
        let mut prev_image_hash: Option<u64> = None;

        loop {
            ticker.tick().await;

            if !monitor_state.is_monitoring.load(Ordering::Relaxed) {
                continue;
            }

            // Try image first (higher priority), then text
            let mut emitted = false;

            match manager.read_image().await {
                Ok(Some((base64_data, width, height))) => {
                    // Use a simple hash of first+last bytes + length as a fast identity check
                    let hash = fast_hash(&base64_data);
                    let changed = prev_image_hash.map_or(true, |h| h != hash);
                    if changed {
                        prev_image_hash = Some(hash);
                        prev_text = None; // clear text tracking since clipboard is now an image
                        let _ = handle.emit("clipboard-changed", ClipboardChangeEvent::Image {
                            base64_data,
                            width,
                            height,
                        });
                    }
                    emitted = true;
                }
                Ok(None) => {
                    // No image — clear image tracking
                    if prev_image_hash.is_some() {
                        prev_image_hash = None;
                    }
                }
                Err(_) => {}
            }

            if !emitted {
                match manager.read().await {
                    Ok(text) if !text.trim().is_empty() => {
                        let changed = prev_text.as_ref().map_or(true, |t| t != &text);
                        if changed {
                            prev_text = Some(text.clone());
                            let _ = handle.emit("clipboard-changed", ClipboardChangeEvent::Text { text });
                        }
                    }
                    _ => {}
                }
            }
        }
    });
}

fn fast_hash(s: &str) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    s.len().hash(&mut hasher);
    // Hash first 64 and last 64 chars for speed on large base64 strings
    let bytes = s.as_bytes();
    let prefix = &bytes[..bytes.len().min(64)];
    let suffix = &bytes[bytes.len().saturating_sub(64)..];
    prefix.hash(&mut hasher);
    suffix.hash(&mut hasher);
    hasher.finish()
}
