use base64::{engine::general_purpose::STANDARD as B64, Engine};
use x25519_dalek::PublicKey;

/// Encode an X25519 public key as a base64 string for transmission.
pub fn encode_pubkey(pk: &PublicKey) -> String {
    B64.encode(pk.as_bytes())
}
