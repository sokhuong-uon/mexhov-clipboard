pub fn detect(text: &str) -> Option<String> {
    let text = text.trim();
    if text.len() > 100 || text.contains('\n') {
        return None;
    }
    csscolorparser::parse(text).ok().map(|c| c.to_css_hex())
}
