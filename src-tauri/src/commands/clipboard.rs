use crate::clipboard::ClipboardManager;
use crate::clipboard_monitor::MonitorState;
use crate::main_window;
use std::sync::atomic::Ordering;
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
