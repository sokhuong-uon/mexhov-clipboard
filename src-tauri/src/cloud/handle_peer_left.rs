use super::emit_peer_count::emit_peer_count;
use super::state::CloudState;

/// Peer disconnected: drop their key and any in-flight ECDH state.
pub(crate) async fn handle_peer_left(state: &CloudState, peer_id: String) {
    state.peer_keys.write().await.remove(&peer_id);
    state.pending_secrets.write().await.remove(&peer_id);
    emit_peer_count(state, 0).await;
}
