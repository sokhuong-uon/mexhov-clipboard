use serde::{Deserialize, Serialize};

/// Wire format for an AES-256-GCM encrypted payload.
/// Both fields are base64-encoded.
#[derive(Serialize, Deserialize)]
pub struct EncryptedEnvelope {
    pub nonce: String,
    pub ciphertext: String,
}
