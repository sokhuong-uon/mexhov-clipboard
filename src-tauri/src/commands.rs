use std::io::Cursor;

use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use crate::clipboard::ClipboardManager;
use scraper::{Html, Selector};
use crate::db::{ClipboardItemRow, Database, InsertClipboardItemParams, UpdateSortOrderParams};
use crate::window_state::{is_visible as window_is_visible, set_visible as window_set_visible};
use tauri::PhysicalPosition;
use tauri::{AppHandle, Manager, State};

pub fn handle_command(app: &AppHandle, command: &str) {
    match command {
        "show" => {
            show_window_at_cursor(app.clone());
        }
        "hide" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
                window_set_visible(false);
            }
        }
        "toggle" => {
            if window_is_visible() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                    window_set_visible(false);
                }
            } else {
                show_window_at_cursor(app.clone());
            }
        }
        _ => {
            // Unknown command, default to show
            show_window_at_cursor(app.clone());
        }
    }
}

pub fn parse_command_from_args(args: &[String]) -> &str {
    // args[0] is typically the executable path
    // args[1] would be the command if provided
    args.get(1).map(|s| s.as_str()).unwrap_or("show")
}

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
pub fn show_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        window_set_visible(true);
    }
}

#[tauri::command]
pub fn show_window_at_cursor(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        // Get window size for positioning calculations
        let window_size = window.inner_size().ok();
        let window_width = window_size.map(|s| s.width as f64).unwrap_or(400.0);
        let window_height = window_size.map(|s| s.height as f64).unwrap_or(300.0);

        // Get screen size from primary monitor
        let monitor = app.primary_monitor().ok().flatten();
        let screen_width = monitor
            .as_ref()
            .map(|m| m.size().width as f64)
            .unwrap_or(1920.0);
        let screen_height = monitor
            .as_ref()
            .map(|m| m.size().height as f64)
            .unwrap_or(1080.0);

        // Try to get cursor position (may fail or return (0,0) on Wayland)
        let (x, y) = if let Ok(cursor_pos) = app.cursor_position() {
            // On Wayland, cursor_position() may return Ok but with (0,0) which is invalid
            // Treat (0,0) as "unknown" and fall back to centering
            if cursor_pos.x == 0.0 && cursor_pos.y == 0.0 {
                let x = (screen_width - window_width) / 2.0;
                let y = (screen_height - window_height) / 2.0;
                (x.max(0.0), y.max(0.0))
            } else {
                // Position window near cursor (offset slightly to avoid covering it)
                // Center horizontally on cursor, offset vertically below cursor
                let mut x = cursor_pos.x - (window_width / 2.0);
                let mut y = cursor_pos.y + 20.0; // Small offset below cursor

                // Clamp to ensure window stays on screen
                x = x.max(0.0).min(screen_width - window_width);
                y = y.max(0.0).min(screen_height - window_height);

                (x, y)
            }
        } else {
            // Fallback: center the window on screen
            let x = (screen_width - window_width) / 2.0;
            let y = (screen_height - window_height) / 2.0;
            (x.max(0.0), y.max(0.0))
        };

        let _ = window.set_position(PhysicalPosition::new(x, y));
        // Ensure window is not minimized
        let _ = window.unminimize();
        // Temporarily set always on top to force window to front (helps on Wayland)
        let _ = window.set_always_on_top(true);
        let _ = window.show();
        let _ = window.set_focus();
        // Disable always on top after focusing
        let _ = window.set_always_on_top(false);
        // Update tracked state after showing window
        window_set_visible(true);
    }
}

#[tauri::command]
pub fn hide_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        window_set_visible(false);
    }
}

#[tauri::command]
pub fn toggle_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(visible) = window.is_visible() {
            if visible {
                let _ = window.hide();
                window_set_visible(false);
            } else {
                let _ = window.show();
                let _ = window.set_focus();
                window_set_visible(true);
            }
        }
    }
}

#[tauri::command]
pub fn is_wayland_session(manager: State<'_, ClipboardManager>) -> bool {
    manager.is_wayland()
}

#[tauri::command]
pub fn is_cosmic_data_control_enabled() -> bool {
    std::env::var("COSMIC_DATA_CONTROL_ENABLED")
        .map(|v| v == "1")
        .unwrap_or(false)
}

#[tauri::command]
pub fn get_system_theme() -> String {
    // Try gsettings (GNOME/COSMIC/GTK-based desktops)
    if let Ok(output) = std::process::Command::new("gsettings")
        .args(["get", "org.gnome.desktop.interface", "color-scheme"])
        .output()
    {
        let value = String::from_utf8_lossy(&output.stdout);
        if value.contains("prefer-dark") {
            return "dark".to_string();
        } else if value.contains("prefer-light") || value.contains("default") {
            return "light".to_string();
        }
    }

    // Fallback: check GTK theme name for "dark" keyword
    if let Ok(output) = std::process::Command::new("gsettings")
        .args(["get", "org.gnome.desktop.interface", "gtk-theme"])
        .output()
    {
        let value = String::from_utf8_lossy(&output.stdout).to_lowercase();
        if value.contains("dark") {
            return "dark".to_string();
        }
    }

    "light".to_string()
}

#[tauri::command]
pub fn detect_env_content(text: String) -> bool {
    let cursor = Cursor::new(text.as_bytes());
    let iter = dotenvy::from_read_iter(cursor);
    let mut valid_count = 0;
    for result in iter {
        match result {
            Ok(_) => valid_count += 1,
            Err(_) => return false,
        }
    }
    valid_count > 0
}

#[tauri::command]
pub fn parse_env_content(text: String) -> Vec<(String, String)> {
    let cursor = Cursor::new(text.as_bytes());
    let iter = dotenvy::from_read_iter(cursor);
    let mut pairs = Vec::new();
    for result in iter {
        match result {
            Ok((key, value)) => pairs.push((key, value)),
            Err(_) => break,
        }
    }
    pairs
}

/// Tries to parse text as a date string. Returns the ISO 8601 representation if detected.
/// Only detects unambiguous formats: ISO 8601, RFC 2822, and JS toLocaleString() with time.
#[tauri::command]
pub fn detect_date_content(text: String) -> Result<Option<String>, String> {
    let text = text.trim();

    // ISO 8601 with timezone: 2026-03-28T14:30:00Z
    if let Ok(dt) = text.parse::<DateTime<Utc>>() {
        return Ok(Some(dt.to_rfc3339()));
    }

    // ISO 8601 with offset: 2026-03-28T14:30:00+05:00
    if let Ok(dt) = DateTime::parse_from_rfc3339(text) {
        return Ok(Some(dt.with_timezone(&Utc).to_rfc3339()));
    }

    // RFC 2822 / UTC string: Sat, 28 Mar 2026 14:30:00 GMT
    if let Ok(dt) = DateTime::parse_from_rfc2822(text) {
        return Ok(Some(dt.with_timezone(&Utc).to_rfc3339()));
    }

    // JS toLocaleString() US 12h: 3/28/2026, 2:30:00 PM
    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %I:%M:%S %p") {
        return Ok(Some(ndt.and_utc().to_rfc3339()));
    }

    // JS toLocaleString() 24h: 3/28/2026, 14:30:00
    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %H:%M:%S") {
        return Ok(Some(ndt.and_utc().to_rfc3339()));
    }

    // JS toLocaleString() without seconds 12h: 3/28/2026, 2:30 PM
    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %I:%M %p") {
        return Ok(Some(ndt.and_utc().to_rfc3339()));
    }

    // JS toLocaleString() without seconds 24h: 3/28/2026, 14:30
    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %H:%M") {
        return Ok(Some(ndt.and_utc().to_rfc3339()));
    }

    // ISO date-only: 2026-03-28
    if let Ok(nd) = NaiveDate::parse_from_str(text, "%Y-%m-%d") {
        if let Some(ndt) = nd.and_hms_opt(0, 0, 0) {
            return Ok(Some(ndt.and_utc().to_rfc3339()));
        }
    }

    Ok(None)
}

/// Detects if text is a CSS color value. Returns the hex representation if detected.
/// Supports: hex, rgb/rgba, hsl/hsla, hwb, lab, lch, oklab, oklch, and named CSS colors.
#[tauri::command]
pub fn detect_color_content(text: String) -> Result<Option<String>, String> {
    let text = text.trim();
    // Reject strings that are too long or contain newlines (not a color)
    if text.len() > 100 || text.contains('\n') {
        return Ok(None);
    }
    match csscolorparser::parse(text) {
        Ok(color) => Ok(Some(color.to_hex_string())),
        Err(_) => Ok(None),
    }
}

#[derive(serde::Serialize)]
pub struct LinkPreviewData {
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub favicon: Option<String>,
    pub site_name: Option<String>,
}

#[tauri::command]
pub async fn fetch_link_preview(url: String) -> Result<LinkPreviewData, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (compatible; LinkPreview/1.0)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html_text = response.text().await.map_err(|e| e.to_string())?;
    let document = Html::parse_document(&html_text);

    let og_title = select_meta_content(&document, "og:title");
    let og_description = select_meta_content(&document, "og:description");
    let og_image = select_meta_content(&document, "og:image");
    let og_site_name = select_meta_content(&document, "og:site_name");

    let title = og_title.or_else(|| {
        Selector::parse("title")
            .ok()
            .and_then(|sel| document.select(&sel).next())
            .map(|el| el.text().collect::<String>())
    });

    let description =
        og_description.or_else(|| select_meta_content_by_name(&document, "description"));

    // Resolve favicon
    let favicon = select_link_href(&document, "icon")
        .or_else(|| select_link_href(&document, "shortcut icon"))
        .map(|href| resolve_url(&url, &href))
        .or_else(|| {
            url::Url::parse(&url)
                .ok()
                .map(|u| format!("{}://{}/favicon.ico", u.scheme(), u.host_str().unwrap_or("")))
        });

    // Resolve og:image relative URLs
    let image = og_image.map(|img| resolve_url(&url, &img));

    Ok(LinkPreviewData {
        title,
        description,
        image,
        favicon,
        site_name: og_site_name,
    })
}

fn select_meta_content(document: &Html, property: &str) -> Option<String> {
    let selector =
        Selector::parse(&format!("meta[property=\"{}\"]", property)).ok()?;
    document
        .select(&selector)
        .next()
        .and_then(|el| el.value().attr("content").map(|s| s.to_string()))
}

fn select_meta_content_by_name(document: &Html, name: &str) -> Option<String> {
    let selector = Selector::parse(&format!("meta[name=\"{}\"]", name)).ok()?;
    document
        .select(&selector)
        .next()
        .and_then(|el| el.value().attr("content").map(|s| s.to_string()))
}

fn select_link_href(document: &Html, rel: &str) -> Option<String> {
    let selector = Selector::parse(&format!("link[rel=\"{}\"]", rel)).ok()?;
    document
        .select(&selector)
        .next()
        .and_then(|el| el.value().attr("href").map(|s| s.to_string()))
}

fn resolve_url(base: &str, href: &str) -> String {
    if href.starts_with("http://") || href.starts_with("https://") {
        return href.to_string();
    }
    if let Ok(base_url) = url::Url::parse(base) {
        if let Ok(resolved) = base_url.join(href) {
            return resolved.to_string();
        }
    }
    href.to_string()
}

// Settings commands

#[tauri::command]
pub fn get_setting(key: String, database: State<'_, Database>) -> Result<Option<String>, String> {
    database.get_setting(&key)
}

#[tauri::command]
pub fn set_setting(
    key: String,
    value: String,
    database: State<'_, Database>,
) -> Result<(), String> {
    database.set_setting(&key, &value)
}

// Database commands

#[tauri::command]
pub fn db_get_all_items(
    limit: i64,
    offset: i64,
    database: State<'_, Database>,
) -> Result<Vec<ClipboardItemRow>, String> {
    database.get_all_items(limit, offset)
}

#[tauri::command]
pub fn db_insert_item(
    params: InsertClipboardItemParams,
    database: State<'_, Database>,
) -> Result<ClipboardItemRow, String> {
    database.insert_item(params)
}

#[tauri::command]
pub fn db_bump_item(
    id: i64,
    sort_order: String,
    database: State<'_, Database>,
) -> Result<ClipboardItemRow, String> {
    database.bump_item(id, &sort_order)
}

#[tauri::command]
pub fn db_delete_item(id: i64, database: State<'_, Database>) -> Result<(), String> {
    database.delete_item(id)
}

#[tauri::command]
pub fn db_clear_all(database: State<'_, Database>) -> Result<(), String> {
    database.clear_all()
}

#[tauri::command]
pub fn db_toggle_favorite(
    id: i64,
    database: State<'_, Database>,
) -> Result<ClipboardItemRow, String> {
    database.toggle_favorite(id)
}

#[tauri::command]
pub fn db_update_sort_orders(
    items: Vec<UpdateSortOrderParams>,
    database: State<'_, Database>,
) -> Result<(), String> {
    database.update_sort_orders(items)
}

#[tauri::command]
pub fn db_get_item_count(database: State<'_, Database>) -> Result<i64, String> {
    database.get_item_count()
}
