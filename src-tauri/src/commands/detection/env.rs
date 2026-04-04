use std::io::Cursor;

/// Env variable keys must be ASCII alphanumeric or underscores,
/// and start with a letter or underscore.
fn is_valid_env_key(key: &str) -> bool {
    !key.is_empty()
        && key
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_')
        && !key.as_bytes()[0].is_ascii_digit()
}

pub fn detect_env(text: &str) -> bool {
    let cursor = Cursor::new(text.as_bytes());
    let iter = dotenvy::from_read_iter(cursor);
    let mut valid_count = 0;
    for result in iter {
        match result {
            Ok((key, _)) => {
                if !is_valid_env_key(&key) {
                    return false;
                }
                valid_count += 1;
            }
            Err(_) => return false,
        }
    }
    valid_count > 0
}

pub fn parse_env(text: &str) -> Vec<(String, String)> {
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
