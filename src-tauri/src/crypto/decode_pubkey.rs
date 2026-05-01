use base64::{engine::general_purpose::STANDARD as B64, Engine};
use x25519_dalek::PublicKey;

/// Decode a base64 string into an X25519 public key.
pub fn decode_pubkey(s: &str) -> Result<PublicKey, String> {
    let bytes = B64
        .decode(s)
        .map_err(|e| format!("bad pubkey base64: {e}"))?;
    let arr: [u8; 32] = bytes
        .try_into()
        .map_err(|_| "pubkey must be 32 bytes".to_string())?;
    Ok(PublicKey::from(arr))
}
