pub fn error_to_string<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

pub fn timestamp_now() -> String {
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_millis())
}
