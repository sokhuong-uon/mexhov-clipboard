use std::collections::HashMap;
use tokio_tungstenite::tungstenite::Message;

use crate::crypto::seal_envelope;
use crate::sync::SyncMessage;

use super::relay_message::RelayMessage;
use super::state::CloudState;

/// The local clipboard changed: encrypt the payload once per known peer
/// (each with their own pairwise key) and bundle into a single `Broadcast`.
/// Returns `None` if there are no peers or serialization fails.
pub(crate) async fn broadcast_local_change(
    state: &CloudState,
    sync_msg: SyncMessage,
) -> Option<Message> {
    let json = serde_json::to_string(&sync_msg).ok()?;

    let keys = state.peer_keys.read().await;
    if keys.is_empty() {
        return None;
    }

    let mut payloads = HashMap::new();
    for (peer_id, peer_key) in keys.iter() {
        if let Ok(encrypted) = seal_envelope(&peer_key.key, &json) {
            payloads.insert(peer_id.clone(), encrypted);
        }
    }
    drop(keys);

    let broadcast = RelayMessage::Broadcast {
        from: state.my_peer_id.clone(),
        payloads,
    };
    serde_json::to_string(&broadcast)
        .ok()
        .map(|j| Message::Text(j.into()))
}
