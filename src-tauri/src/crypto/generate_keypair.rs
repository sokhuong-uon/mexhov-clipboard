use x25519_dalek::{EphemeralSecret, PublicKey};

/// Generate a fresh ephemeral X25519 keypair for one ECDH exchange.
pub fn generate_keypair() -> (EphemeralSecret, PublicKey) {
    let secret = EphemeralSecret::random_from_rng(&mut rand::rng());
    let public = PublicKey::from(&secret);
    (secret, public)
}
