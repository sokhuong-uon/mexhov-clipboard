use argon2::Argon2;

const SALT: &[u8] = b"mexboard-sync-static-salt";

/// Derive an AES-256-GCM key from an ECDH shared secret using Argon2id.
pub fn derive_aes_key(shared_secret: &[u8; 32]) -> [u8; 32] {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(shared_secret, SALT, &mut key)
        .expect("argon2 key derivation failed");
    key
}
