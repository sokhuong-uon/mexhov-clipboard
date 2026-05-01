use tokio_tungstenite::tungstenite::Message;

use crate::crypto::{encode_pubkey, generate_keypair};

use super::emit_peer_count::emit_peer_count;
use super::relay_message::RelayMessage;
use super::state::CloudState;

/// A new peer joined: initiate ECDH by sending our pubkey to them.
/// Stash the secret in `pending_secrets` so we can finish the exchange when
/// the peer's `KeyExchangeAck` arrives.
pub(crate) async fn handle_peer_joined(
    state: &CloudState,
    peer_id: String,
) -> Option<Message> {
    let (secret, pk) = generate_keypair();
    let request = RelayMessage::KeyExchange {
        from: state.my_peer_id.clone(),
        to: peer_id.clone(),
        pubkey: encode_pubkey(&pk),
    };
    state.pending_secrets.write().await.insert(peer_id, secret);

    emit_peer_count(state, 1).await;

    serde_json::to_string(&request)
        .ok()
        .map(|j| Message::Text(j.into()))
}
