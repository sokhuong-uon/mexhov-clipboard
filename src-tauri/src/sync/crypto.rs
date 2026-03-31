use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use serde::{Deserialize, Serialize};
use x25519_dalek::{EphemeralSecret, PublicKey};

const SALT: &[u8] = b"ohcp-clipboard-sync-v1";

// ── Pairing code ───────────────────────────────────────────────────

pub fn generate_pairing_code() -> String {
    let code: u32 = rand::random_range(0..1_000_000);
    format!("{code:06}")
}

// ── ECDH key exchange ─────────────────────────────────────────────

/// Generate an ephemeral X25519 keypair.
pub fn generate_keypair() -> (EphemeralSecret, PublicKey) {
    let secret = EphemeralSecret::random_from_rng(&mut rand::rng());
    let public = PublicKey::from(&secret);
    (secret, public)
}

/// Derive the AES-256-GCM key from an ECDH shared secret using Argon2id.
pub fn derive_key_from_shared_secret(shared_secret: &[u8; 32]) -> [u8; 32] {
    use argon2::Argon2;
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(shared_secret, SALT, &mut key)
        .expect("argon2 key derivation failed");
    key
}

/// Encode a public key to base64 for transmission.
pub fn encode_pubkey(pk: &PublicKey) -> String {
    use base64::{engine::general_purpose::STANDARD as B64, Engine};
    B64.encode(pk.as_bytes())
}

/// Decode a base64 public key received from a peer.
pub fn decode_pubkey(s: &str) -> Result<PublicKey, String> {
    use base64::{engine::general_purpose::STANDARD as B64, Engine};
    let bytes = B64
        .decode(s)
        .map_err(|e| format!("bad pubkey base64: {e}"))?;
    let arr: [u8; 32] = bytes
        .try_into()
        .map_err(|_| "pubkey must be 32 bytes".to_string())?;
    Ok(PublicKey::from(arr))
}

// ── Encrypt / Decrypt ──────────────────────────────────────────────

pub fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> Result<(Vec<u8>, [u8; 12]), String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let mut nonce_bytes = [0u8; 12];
    rand::fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| e.to_string())?;
    Ok((ciphertext, nonce_bytes))
}

pub fn decrypt(key: &[u8; 32], nonce: &[u8; 12], ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(nonce);
    cipher.decrypt(nonce, ciphertext).map_err(|e| e.to_string())
}

// ── Encrypted envelope (wire format) ───────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct EncryptedEnvelope {
    pub nonce: String,      // base64
    pub ciphertext: String, // base64
}

impl EncryptedEnvelope {
    pub fn seal(key: &[u8; 32], plaintext_json: &str) -> Result<String, String> {
        use base64::{engine::general_purpose::STANDARD as B64, Engine};
        let (ciphertext, nonce) = encrypt(key, plaintext_json.as_bytes())?;
        let envelope = Self {
            nonce: B64.encode(nonce),
            ciphertext: B64.encode(ciphertext),
        };
        serde_json::to_string(&envelope).map_err(|e| e.to_string())
    }

    pub fn open(key: &[u8; 32], envelope_json: &str) -> Result<String, String> {
        use base64::{engine::general_purpose::STANDARD as B64, Engine};
        let envelope: Self =
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
}

// ── Handshake messages ─────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum HandshakeMessage {
    Auth {
        code: String,
        pubkey: String, // base64-encoded X25519 public key
    },
    AuthOk {
        pubkey: String, // base64-encoded X25519 public key
    },
}
