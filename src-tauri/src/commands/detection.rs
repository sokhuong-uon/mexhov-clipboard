use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use std::io::Cursor;

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

#[tauri::command]
pub fn detect_date_content(text: String) -> Result<Option<String>, String> {
    let text = text.trim();

    if let Ok(dt) = text.parse::<DateTime<Utc>>() {
        return Ok(Some(dt.to_rfc3339()));
    }

    if let Ok(dt) = DateTime::parse_from_rfc3339(text) {
        return Ok(Some(dt.with_timezone(&Utc).to_rfc3339()));
    }

    if let Ok(dt) = DateTime::parse_from_rfc2822(text) {
        return Ok(Some(dt.with_timezone(&Utc).to_rfc3339()));
    }

    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %I:%M:%S %p") {
        return Ok(Some(ndt.and_utc().to_rfc3339()));
    }

    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %H:%M:%S") {
        return Ok(Some(ndt.and_utc().to_rfc3339()));
    }

    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %I:%M %p") {
        return Ok(Some(ndt.and_utc().to_rfc3339()));
    }

    if let Ok(ndt) = NaiveDateTime::parse_from_str(text, "%m/%d/%Y, %H:%M") {
        return Ok(Some(ndt.and_utc().to_rfc3339()));
    }

    if let Ok(nd) = NaiveDate::parse_from_str(text, "%Y-%m-%d") {
        if let Some(ndt) = nd.and_hms_opt(0, 0, 0) {
            return Ok(Some(ndt.and_utc().to_rfc3339()));
        }
    }

    Ok(None)
}

#[tauri::command]
pub fn detect_color_content(text: String) -> Result<Option<String>, String> {
    let text = text.trim();
    if text.len() > 100 || text.contains('\n') {
        return Ok(None);
    }
    match csscolorparser::parse(text) {
        Ok(color) => Ok(Some(color.to_css_hex())),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub fn convert_color(text: String, format: String) -> Result<String, String> {
    let color = csscolorparser::parse(text.trim()).map_err(|e| e.to_string())?;
    let result = match format.as_str() {
        "hex" => color.to_css_hex(),
        "hex-no-hash" => color.to_css_hex().trim_start_matches('#').to_string(),
        "rgb" => color.to_css_rgb(),
        "hsl" => color.to_css_hsl(),
        "hwb" => color.to_css_hwb(),
        "oklch" => color.to_css_oklch(),
        _ => return Err(format!("Unknown format: {}", format)),
    };
    Ok(result)
}
