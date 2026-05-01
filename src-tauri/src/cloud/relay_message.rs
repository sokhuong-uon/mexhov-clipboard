use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Wire messages exchanged with the cloud relay (before E2E encryption).
/// The relay forwards `Data` and `Broadcast` payloads as-is — encryption is
/// established directly between peers via ECDH.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub(crate) enum RelayMessage {
    /// Relay tells us our peer ID and room info.
    Welcome { peer_id: String, room_id: String },
    /// Relay notifies a new peer joined.
    PeerJoined { peer_id: String },
    /// Relay notifies a peer left.
    PeerLeft { peer_id: String },
    /// Key exchange: send our public key to a specific peer.
    KeyExchange {
        from: String,
        to: String,
        pubkey: String,
    },
    /// Key exchange acknowledgement with the responder's public key.
    KeyExchangeAck {
        from: String,
        to: String,
        pubkey: String,
    },
    /// Encrypted data message routed to a specific peer.
    Data {
        from: String,
        to: String,
        payload: String, // EncryptedEnvelope JSON
    },
    /// Broadcast data to all peers (each copy encrypted with per-peer key).
    Broadcast {
        from: String,
        payloads: HashMap<String, String>, // peer_id -> EncryptedEnvelope JSON
    },
}
