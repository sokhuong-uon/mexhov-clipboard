use std::collections::HashMap;

use super::forward_decrypted_clipboard::forward_decrypted_clipboard;
use super::state::CloudState;

/// A peer broadcast their clipboard payload to every peer in the room. The
/// broadcast carries one ciphertext per recipient (each encrypted with that
/// peer's pairwise key) — pick ours and forward.
pub(crate) async fn receive_broadcast_clipboard(
    state: &CloudState,
    from: String,
    payloads: HashMap<String, String>,
) {
    let Some(payload) = payloads.get(&state.my_peer_id) else {
        return;
    };
    let keys = state.peer_keys.read().await;
    let Some(peer_key) = keys.get(&from) else {
        return;
    };
    forward_decrypted_clipboard(state, &peer_key.key, payload).await;
}
