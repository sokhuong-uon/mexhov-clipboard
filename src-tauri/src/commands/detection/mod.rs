pub mod color;
pub mod date;
pub mod env;
pub mod secret;

#[tauri::command]
pub fn detect_env_content(text: String) -> bool {
    env::detect_env(&text)
}

#[tauri::command]
pub fn parse_env_content(text: String) -> Vec<(String, String)> {
    env::parse_env(&text)
}

#[tauri::command]
pub fn detect_date_content(text: String) -> Result<Option<String>, String> {
    Ok(date::detect_date(&text))
}

#[tauri::command]
pub fn detect_color_content(text: String) -> Result<Option<String>, String> {
    Ok(color::detect_color(&text))
}

#[tauri::command]
pub fn convert_color(text: String, format: String) -> Result<String, String> {
    color::convert_color(&text, &format)
}
