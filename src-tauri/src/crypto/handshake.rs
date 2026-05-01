use serde::{Deserialize, Serialize};

/// Wire messages exchanged during the LAN/cloud sync handshake.
///
/// Flow:
///   client → server : Connect          { hostname, pubkey }
///   server → client : ConnectPending                       (waiting for operator approval)
///   server → client : ConnectApproved  { pubkey } | ConnectRejected
///
/// On `ConnectApproved` both sides perform ECDH with the exchanged pubkeys
/// and switch to encrypted traffic.
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum HandshakeMessage {
    Connect {
        hostname: String,
        pubkey: String, // base64-encoded X25519 public key
    },
    ConnectPending,
    ConnectApproved {
        pubkey: String, // base64-encoded X25519 public key
    },
    ConnectRejected,
}
