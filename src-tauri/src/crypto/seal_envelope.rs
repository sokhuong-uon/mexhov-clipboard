use base64::{engine::general_purpose::STANDARD as B64, Engine};

use super::encrypt::encrypt;
use super::envelope::EncryptedEnvelope;

/// Encrypt a JSON plaintext into a base64 `EncryptedEnvelope` (serialized as JSON).
pub fn seal_envelope(key: &[u8; 32], plaintext_json: &str) -> Result<String, String> {
    let (ciphertext, nonce) = encrypt(key, plaintext_json.as_bytes())?;
    let envelope = EncryptedEnvelope {
        nonce: B64.encode(nonce),
        ciphertext: B64.encode(ciphertext),
    };
    serde_json::to_string(&envelope).map_err(|e| e.to_string())
}
