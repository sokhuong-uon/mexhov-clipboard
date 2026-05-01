use x25519_dalek::{EphemeralSecret, PublicKey};

use super::derive_aes_key::derive_aes_key;

/// Derive an AES-256-GCM key that *both peers will compute the same way*,
/// without ever transmitting the key itself.
///
/// You provide your own ephemeral secret and the peer's public key; the peer
/// independently does the mirror operation with their secret and your public
/// key. The math (X25519 Diffie–Hellman) guarantees both sides land on the
/// same shared secret, which we then run through Argon2id to get the final
/// session key.
pub fn derive_shared_key(my_secret: EphemeralSecret, their_pubkey: &PublicKey) -> [u8; 32] {
    let shared = my_secret.diffie_hellman(their_pubkey);
    derive_aes_key(shared.as_bytes())
}
