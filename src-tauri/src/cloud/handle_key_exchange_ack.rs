use crate::crypto::{decode_pubkey, derive_shared_key};

use super::emit_peer_count::emit_peer_count;
use super::peer_key::PeerKey;
use super::state::CloudState;

/// Peer acknowledged the ECDH we initiated: pull our stashed secret, derive
/// the shared key, and store it.
pub(crate) async fn handle_key_exchange_ack(
    state: &CloudState,
    from: String,
    pubkey: String,
) {
    let Ok(their_pk) = decode_pubkey(&pubkey) else {
        return;
    };

    let secret = match state.pending_secrets.write().await.remove(&from) {
        Some(s) => s,
        None => return,
    };

    let key = derive_shared_key(secret, &their_pk);
    state.peer_keys.write().await.insert(from, PeerKey { key });

    emit_peer_count(state, 0).await;
}
