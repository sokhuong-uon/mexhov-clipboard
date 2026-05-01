use crate::crypto::open_envelope;
use crate::sync::{content_hash, SyncMessage};

use super::state::CloudState;

/// Decrypt a clipboard payload with the given peer key, parse it, mark its
/// hash so the local monitor doesn't echo it back, then push it to the
/// clipboard monitor's input channel.
///
/// Silently drops malformed or undecryptable payloads — we can't tell good
/// noise from a tampering attempt, so neither is logged or surfaced.
pub(crate) async fn forward_decrypted_clipboard(
    state: &CloudState,
    peer_key: &[u8; 32],
    payload: &str,
) {
    let Ok(plaintext) = open_envelope(peer_key, payload) else {
        return;
    };
    let Ok(sync_msg) = serde_json::from_str::<SyncMessage>(&plaintext) else {
        return;
    };
    *state.last_remote_hash.write().await = Some(content_hash(&sync_msg));
    let _ = state.incoming_tx.send(sync_msg);
}
