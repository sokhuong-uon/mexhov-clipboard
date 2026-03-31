use crate::clipboard::ClipboardManager;
use crate::clipboard_monitor::MonitorState;
use crate::window_state::set_visible as window_set_visible;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn read_clipboard(manager: State<'_, ClipboardManager>) -> Result<String, String> {
    manager.read().await
}

#[tauri::command]
pub async fn read_clipboard_image(
    manager: State<'_, ClipboardManager>,
) -> Result<Option<(String, u32, u32)>, String> {
    manager.read_image().await
}

#[tauri::command]
pub async fn write_clipboard(
    text: String,
    manager: State<'_, ClipboardManager>,
) -> Result<(), String> {
    manager.write(text).await
}

#[tauri::command]
pub async fn write_clipboard_image(
    base64_data: String,
    manager: State<'_, ClipboardManager>,
) -> Result<(), String> {
    manager.write_image(base64_data).await
}

#[tauri::command]
pub async fn reinitialize_clipboard(manager: State<'_, ClipboardManager>) -> Result<(), String> {
    manager.reinitialize()
}

#[tauri::command]
pub fn set_monitoring(enabled: bool, state: State<'_, MonitorState>) {
    state
        .is_monitoring
        .store(enabled, std::sync::atomic::Ordering::Relaxed);
}

/// Copies content to clipboard, hides the window, and simulates Ctrl+V.
#[tauri::command]
pub async fn paste_item(
    content_type: String,
    text_content: Option<String>,
    image_data: Option<String>,
    app: AppHandle,
    manager: State<'_, ClipboardManager>,
) -> Result<(), String> {
    let is_wayland = manager.is_wayland();

    match content_type.as_str() {
        "text" => {
            let text = text_content.ok_or("missing text_content")?;
            manager.write(text).await?;
        }
        "image" => {
            let data = image_data.ok_or("missing image_data")?;
            let result = tokio::task::spawn_blocking(move || {
                use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
                let png_bytes = BASE64
                    .decode(&data)
                    .map_err(|e| format!("Failed to decode base64: {e}"))?;

                if is_wayland {
                    use std::io::Write;
                    use std::process::{Command, Stdio};

                    let mut child = Command::new("wl-copy")
                        .arg("--type")
                        .arg("image/png")
                        .stdin(Stdio::piped())
                        .stdout(Stdio::null())
                        .stderr(Stdio::piped())
                        .spawn()
                        .map_err(|e| format!("wl-copy spawn failed: {e}"))?;

                    if let Some(mut stdin) = child.stdin.take() {
                        stdin
                            .write_all(&png_bytes)
                            .map_err(|e| format!("wl-copy stdin write failed: {e}"))?;
                    }

                    std::thread::sleep(std::time::Duration::from_millis(100));
                    Ok::<(), String>(())
                } else {
                    Err("non-wayland image paste not implemented in paste_item".to_string())
                }
            })
            .await
            .map_err(|e| format!("spawn_blocking failed: {e}"))?;
            result?;
        }
        _ => return Err(format!("unknown content_type: {content_type}")),
    }

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        window_set_visible(false);
    }

    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

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
