pub fn detect_secret(text: &str) -> bool {
    let text = text.trim();

    // Check known patterns first (AWS, GitHub, Stripe, etc.)
    let patterns = secretscan::get_all_patterns();
    for (_name, regex) in patterns.iter() {
        if regex.is_match(text) {
            return true;
        }
    }

    // For single-line strings, check if it looks like a high-entropy secret
    // (e.g. Azure/Entra ID client secrets, generic API keys)
    if !text.contains('\n') && looks_like_secret(text) {
        return true;
    }

    false
}

/// Detects high-entropy single-token strings that are likely secrets.
/// Targets base64-encoded secrets (like Azure client secrets) and
/// hex-encoded keys that don't match any known prefix pattern.
fn looks_like_secret(text: &str) -> bool {
    let len = text.len();

    // Too short or too long to be a standalone secret token
    if len < 20 || len > 256 {
        return false;
    }

    // Must be a single token (no spaces or common prose characters)
    if text.contains(' ') || text.contains(',') {
        return false;
    }

    // Check if it looks like base64 (alphanumeric + /+=)
    let is_base64_like = text.bytes().all(|b| {
        b.is_ascii_alphanumeric() || b == b'+' || b == b'/' || b == b'=' || b == b'-' || b == b'_'
    });

    // Check if it looks like hex (even length, all hex chars)
    let is_hex_like = len % 2 == 0 && len >= 32 && text.bytes().all(|b| b.is_ascii_hexdigit());

    if !is_base64_like && !is_hex_like {
        return false;
    }

    // Calculate Shannon entropy
    let entropy = shannon_entropy(text);

    // High entropy threshold — normal words/sentences score ~3-4,
    // random secrets score ~5-6
    entropy > 4.0
}

fn shannon_entropy(text: &str) -> f64 {
    let mut freq = [0u32; 256];
    let len = text.len() as f64;

    for &b in text.as_bytes() {
        freq[b as usize] += 1;
    }

    freq.iter()
        .filter(|&&count| count > 0)
        .map(|&count| {
            let p = count as f64 / len;
            -p * p.log2()
        })
        .sum()
}
