use base64::{engine::general_purpose::STANDARD as B64, Engine};

use super::decrypt::decrypt;
use super::envelope::EncryptedEnvelope;

/// Decrypt a serialized `EncryptedEnvelope` JSON back into the original plaintext string.
pub fn open_envelope(key: &[u8; 32], envelope_json: &str) -> Result<String, String> {
    let envelope: EncryptedEnvelope =
        serde_json::from_str(envelope_json).map_err(|e| format!("bad envelope: {e}"))?;
    let nonce_bytes: [u8; 12] = B64
        .decode(&envelope.nonce)
        .map_err(|e| e.to_string())?
        .try_into()
        .map_err(|_| "invalid nonce length".to_string())?;
    let ciphertext = B64
        .decode(&envelope.ciphertext)
        .map_err(|e| e.to_string())?;
    let plaintext = decrypt(key, &nonce_bytes, &ciphertext)?;
    String::from_utf8(plaintext).map_err(|e| e.to_string())
}
