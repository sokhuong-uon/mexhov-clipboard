use sha2::{Digest, Sha256};

pub fn compute_content_hash(
    content_type: &str,
    text_content: &Option<String>,
    image_data: &Option<String>,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content_type.as_bytes());
    hasher.update(b":");
    match content_type {
        "text" => {
            if let Some(text) = text_content {
                hasher.update(text.as_bytes());
            }
        }
        "image" => {
            if let Some(data) = image_data {
                hasher.update(data.as_bytes());
            }
        }
        _ => {}
    }
    format!("{:x}", hasher.finalize())
}
