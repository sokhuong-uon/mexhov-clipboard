pub fn detect_color(text: &str) -> Option<String> {
    let text = text.trim();
    if text.len() > 100 || text.contains('\n') {
        return None;
    }
    csscolorparser::parse(text).ok().map(|c| c.to_css_hex())
}

pub fn convert_color(text: &str, format: &str) -> Result<String, String> {
    let color = csscolorparser::parse(text.trim()).map_err(|e| e.to_string())?;
    match format {
        "hex" => Ok(color.to_css_hex()),
        "hex-no-hash" => Ok(color.to_css_hex().trim_start_matches('#').to_string()),
        "rgb" => Ok(color.to_css_rgb()),
        "hsl" => Ok(color.to_css_hsl()),
        "hwb" => Ok(color.to_css_hwb()),
        "oklch" => Ok(color.to_css_oklch()),
        _ => Err(format!("Unknown format: {}", format)),
    }
}
