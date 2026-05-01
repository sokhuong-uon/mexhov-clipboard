use tokio_tungstenite::tungstenite::Message;

use crate::crypto::{decode_pubkey, derive_shared_key, encode_pubkey, generate_keypair};

use super::emit_peer_count::emit_peer_count;
use super::peer_key::PeerKey;
use super::relay_message::RelayMessage;
use super::state::CloudState;

/// Another peer sent us their pubkey: derive the shared key and reply with
/// our own pubkey via `KeyExchangeAck`.
pub(crate) async fn handle_key_exchange(
    state: &CloudState,
    from: String,
    pubkey: String,
) -> Option<Message> {
    let their_pk = decode_pubkey(&pubkey).ok()?;
    let (our_secret, our_pk) = generate_keypair();
    let key = derive_shared_key(our_secret, &their_pk);

    state
        .peer_keys
        .write()
        .await
        .insert(from.clone(), PeerKey { key });

    let ack = RelayMessage::KeyExchangeAck {
        from: state.my_peer_id.clone(),
        to: from,
        pubkey: encode_pubkey(&our_pk),
    };

    emit_peer_count(state, 0).await;

    serde_json::to_string(&ack)
        .ok()
        .map(|j| Message::Text(j.into()))
}
