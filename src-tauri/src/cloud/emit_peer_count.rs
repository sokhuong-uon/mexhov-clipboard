use crate::sync::emit_status;

use super::state::CloudState;

/// Emit a status update with the current number of connected peers.
///
/// `in_flight` lets the caller add a delta for a peer whose handshake is
/// underway but not yet recorded in `peer_keys` (e.g. just after stashing
/// a pending secret in `handle_peer_joined`).
pub(crate) async fn emit_peer_count(state: &CloudState, in_flight: usize) {
    let mode = state.mode.read().await;
    let count = state.peer_keys.read().await.len() + in_flight;
    emit_status(&state.app, &mode, count);
}
