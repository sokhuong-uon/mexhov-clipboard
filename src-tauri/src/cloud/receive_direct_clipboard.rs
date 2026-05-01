use super::forward_decrypted_clipboard::forward_decrypted_clipboard;
use super::state::CloudState;

/// A peer sent their clipboard payload directly to us.
pub(crate) async fn receive_direct_clipboard(
    state: &CloudState,
    from: String,
    payload: String,
) {
    let keys = state.peer_keys.read().await;
    let Some(peer_key) = keys.get(&from) else {
        return;
    };
    forward_decrypted_clipboard(state, &peer_key.key, &payload).await;
}
