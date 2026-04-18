use crate::clipboard::ClipboardManager;
use crate::clipboard_monitor::MonitorState;
use crate::detection::env;
use crate::main_window;
use std::path::Path;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
#[specta::specta]
pub async fn read_clipboard(manager: State<'_, ClipboardManager>) -> Result<String, String> {
    manager.read().await
}

#[tauri::command]
#[specta::specta]
pub async fn read_clipboard_image(
    manager: State<'_, ClipboardManager>,
) -> Result<Option<(String, u32, u32)>, String> {
    manager.read_image().await
}

#[tauri::command]
#[specta::specta]
pub async fn write_clipboard(
    text: String,
    manager: State<'_, ClipboardManager>,
) -> Result<(), String> {
    manager.write(text).await
}

#[tauri::command]
#[specta::specta]
pub async fn write_clipboard_image(
    base64_data: String,
    manager: State<'_, ClipboardManager>,
) -> Result<(), String> {
    manager.write_image(base64_data).await
}

#[tauri::command]
#[specta::specta]
pub async fn reinitialize_clipboard(manager: State<'_, ClipboardManager>) -> Result<(), String> {
    manager.reinitialize()
}

#[tauri::command]
#[specta::specta]
pub fn parse_env_content(text: String) -> Vec<(String, String)> {
    env::parse_env(&text)
}

#[tauri::command]
#[specta::specta]
pub fn set_monitoring(enabled: bool, state: State<'_, MonitorState>) {
    state
        .is_monitoring
        .store(enabled, std::sync::atomic::Ordering::Relaxed);
}

/// Copies content to clipboard, hides the window, and simulates Ctrl+V.
#[tauri::command]
#[specta::specta]
pub async fn paste_item(
    content_type: String,
    text_content: Option<String>,
    image_data: Option<String>,
    app: AppHandle,
    manager: State<'_, ClipboardManager>,
    monitor: State<'_, MonitorState>,
) -> Result<(), String> {
    // Pause clipboard monitor to avoid wl-paste/wl-copy conflicts on Wayland
    let was_monitoring = monitor.is_monitoring.swap(false, Ordering::Relaxed);

    let write_result = match content_type.as_str() {
        "text" => {
            let text = text_content.ok_or("missing text_content")?;
            manager.write(text).await
        }
        "image" => {
            let data = image_data.ok_or("missing image_data")?;
            manager.write_image(data).await
        }
        _ => return Err(format!("unknown content_type: {content_type}")),
    };

    // Re-enable monitoring
    if was_monitoring {
        monitor.is_monitoring.store(true, Ordering::Relaxed);
    }

    write_result?;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        main_window::set_visible(false);
    }

    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

    simulate_ctrl_v()
}

fn simulate_ctrl_v() -> Result<(), String> {
    use enigo::{Direction, Enigo, Key, Keyboard, Settings};
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo
        .key(Key::Control, Direction::Press)
        .map_err(|e| e.to_string())?;
    enigo
        .key(Key::Unicode('v'), Direction::Click)
        .map_err(|e| e.to_string())?;
    enigo
        .key(Key::Control, Direction::Release)
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Writes a file:// URI to the clipboard as text/uri-list, hides the window,
/// and simulates Ctrl+V. Wayland-only for now (shells out to wl-copy).
#[tauri::command]
#[specta::specta]
pub async fn paste_file_uri(
    path: String,
    app: AppHandle,
    monitor: State<'_, MonitorState>,
) -> Result<(), String> {
    if std::env::var("WAYLAND_DISPLAY").is_err() {
        return Err("paste_file_uri is Wayland-only".to_string());
    }

    let abs = Path::new(&path);
    if !abs.is_absolute() {
        return Err(format!("path must be absolute: {path}"));
    }
    if !abs.exists() {
        return Err(format!("file not found: {path}"));
    }

    // Encode path segments for the URI. Keep '/' as separator.
    let encoded_path = abs
        .to_str()
        .ok_or_else(|| "path is not valid UTF-8".to_string())?
        .split('/')
        .map(|seg| {
            if seg.is_empty() {
                String::new()
            } else {
                url::form_urlencoded::byte_serialize(seg.as_bytes()).collect()
            }
        })
        .collect::<Vec<_>>()
        .join("/");
    let uri = format!("file://{encoded_path}\r\n");

    // Read bytes too: Telegram-style apps ignore file URIs and only look at
    // image MIME types on the clipboard, so we expose both.
    let bytes = std::fs::read(abs).map_err(|e| format!("read file failed: {e}"))?;
    let image_mime = guess_image_mime(abs);

    let was_monitoring = monitor.is_monitoring.swap(false, Ordering::Relaxed);

    let write_result = write_file_clipboard_wayland(&uri, &bytes, image_mime);

    if was_monitoring {
        monitor.is_monitoring.store(true, Ordering::Relaxed);
    }

    write_result?;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        main_window::set_visible(false);
    }

    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

    simulate_ctrl_v()
}

fn guess_image_mime(path: &Path) -> Option<&'static str> {
    let ext = path.extension()?.to_str()?.to_lowercase();
    match ext.as_str() {
        "gif" => Some("image/gif"),
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "webp" => Some("image/webp"),
        "bmp" => Some("image/bmp"),
        "svg" => Some("image/svg+xml"),
        _ => None,
    }
}

#[cfg(target_os = "linux")]
fn write_file_clipboard_wayland(
    uri_list: &str,
    bytes: &[u8],
    image_mime: Option<&'static str>,
) -> Result<(), String> {
    use wl_clipboard_rs::copy::{MimeSource, MimeType, Options, Source};

    // text/uri-list entries are CRLF-terminated; gnome-copied-files uses LF
    // and is prefixed with the operation name ("copy").
    let uri_no_crlf = uri_list.trim_end_matches("\r\n");
    let gnome_payload = format!("copy\n{uri_no_crlf}");

    let mut sources = vec![
        MimeSource {
            source: Source::Bytes(uri_list.as_bytes().to_vec().into_boxed_slice()),
            mime_type: MimeType::Specific("text/uri-list".to_string()),
        },
        MimeSource {
            source: Source::Bytes(gnome_payload.into_bytes().into_boxed_slice()),
            mime_type: MimeType::Specific("x-special/gnome-copied-files".to_string()),
        },
    ];

    if let Some(mime) = image_mime {
        sources.push(MimeSource {
            source: Source::Bytes(bytes.to_vec().into_boxed_slice()),
            mime_type: MimeType::Specific(mime.to_string()),
        });
    }

    let opts = Options::new();
    opts.copy_multi(sources)
        .map_err(|e| format!("wl-clipboard-rs copy_multi failed: {e}"))
}

#[cfg(not(target_os = "linux"))]
fn write_file_clipboard_wayland(
    _uri_list: &str,
    _bytes: &[u8],
    _image_mime: Option<&'static str>,
) -> Result<(), String> {
    Err("paste_file_uri is only supported on Linux".to_string())
}
