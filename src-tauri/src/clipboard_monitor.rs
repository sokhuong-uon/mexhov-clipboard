use crate::clipboard::ClipboardManager;
use crate::sync::{self, SyncMessage, SyncState};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};
use tokio::time::{interval, Duration};

#[derive(Clone, Serialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum ClipboardChangeEvent {
    Text {
        text: String,
    },
    Image {
        base64_data: String,
        width: u32,
        height: u32,
    },
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

    // Task 1: poll the local clipboard and broadcast changes
    tauri::async_runtime::spawn(async move {
        let manager = handle.state::<ClipboardManager>();
        let monitor_state = handle.state::<MonitorState>();
        let sync_state = handle.state::<SyncState>();
        let mut ticker = interval(Duration::from_millis(500));
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
                    let hash = fast_hash(&base64_data);
                    let changed = prev_image_hash.map_or(true, |h| h != hash);
                    if changed {
                        prev_image_hash = Some(hash);
                        prev_text = None;
                        let _ = handle.emit(
                            "clipboard-changed",
                            ClipboardChangeEvent::Image {
                                base64_data: base64_data.clone(),
                                width,
                                height,
                            },
                        );
                        // Broadcast to sync peers if this wasn't from remote
                        if !is_from_remote(
                            &sync_state,
                            &SyncMessage::Image {
                                base64_data: base64_data.clone(),
                                width,
                                height,
                            },
                        )
                        .await
                        {
                            sync_state.broadcast(SyncMessage::Image {
                                base64_data,
                                width,
                                height,
                            });
                        }
                    }
                    emitted = true;
                }
                Ok(None) => {
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
                            let _ = handle.emit(
                                "clipboard-changed",
                                ClipboardChangeEvent::Text { text: text.clone() },
                            );
                            // Broadcast to sync peers if this wasn't from remote
                            if !is_from_remote(
                                &sync_state,
                                &SyncMessage::Text { text: text.clone() },
                            )
                            .await
                            {
                                sync_state.broadcast(SyncMessage::Text { text });
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
    });

    // Task 2: consume incoming remote clipboard changes
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let sync_state = handle.state::<SyncState>();
        let manager = handle.state::<ClipboardManager>();
        let mut rx = sync_state.incoming_rx.lock().await;

        while let Some(msg) = rx.recv().await {
            match &msg {
                SyncMessage::Text { text } => {
                    let _ = manager.write(text.clone()).await;
                    let _ = handle.emit(
                        "clipboard-changed",
                        ClipboardChangeEvent::Text { text: text.clone() },
                    );
                }
                SyncMessage::Image {
                    base64_data,
                    width,
                    height,
                } => {
                    let _ = manager.write_image(base64_data.clone()).await;
                    let _ = handle.emit(
                        "clipboard-changed",
                        ClipboardChangeEvent::Image {
                            base64_data: base64_data.clone(),
                            width: *width,
                            height: *height,
                        },
                    );
                }
            }
        }
    });
}

/// Check if a clipboard change matches the last remote content (echo suppression).
async fn is_from_remote(sync_state: &SyncState, msg: &SyncMessage) -> bool {
    let hash = sync::content_hash(msg);
    let mut remote_hash = sync_state.last_remote_hash.write().await;
    if *remote_hash == Some(hash) {
        // Consume the marker so subsequent identical local copies still sync
        *remote_hash = None;
        true
    } else {
        false
    }
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
