use std::collections::HashMap;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::{broadcast, mpsc, watch, RwLock};

use crate::sync::{SyncMessage, SyncMode};

use super::connect_relay::connect_relay;
use super::run_event_loop::run_event_loop;
use super::state::CloudState;

/// Connect to the cloud relay, complete the welcome handshake, then spawn a
/// background task that runs the session event loop. Returns the assigned
/// `room_id` once the welcome is received.
#[allow(clippy::too_many_arguments)]
pub async fn spawn(
    relay_url: &str,
    auth_token: &str,
    outgoing_tx: broadcast::Sender<SyncMessage>,
    incoming_tx: mpsc::UnboundedSender<SyncMessage>,
    last_remote_hash: Arc<RwLock<Option<u64>>>,
    shutdown_rx: watch::Receiver<bool>,
    app: AppHandle,
    mode: Arc<RwLock<SyncMode>>,
) -> Result<String, String> {
    let (ws_stream, my_peer_id, room_id) = connect_relay(relay_url, auth_token).await?;

    let state = CloudState {
        my_peer_id,
        peer_keys: Arc::new(RwLock::new(HashMap::new())),
        pending_secrets: Arc::new(RwLock::new(HashMap::new())),
        last_remote_hash,
        incoming_tx,
        app,
        mode,
    };

    let outgoing_rx = outgoing_tx.subscribe();
    tokio::spawn(run_event_loop(state, ws_stream, outgoing_rx, shutdown_rx));

    Ok(room_id)
}
