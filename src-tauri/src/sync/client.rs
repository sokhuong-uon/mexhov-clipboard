use super::{PeerMap, SyncMessage};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

/// Connect to a remote WebSocket server and spawn the peer handler.
pub async fn spawn(
    address: &str,
    peers: PeerMap,
    outgoing_tx: broadcast::Sender<SyncMessage>,
    incoming_tx: tokio::sync::mpsc::UnboundedSender<SyncMessage>,
    last_remote_hash: Arc<RwLock<Option<u64>>>,
    peer_counter: Arc<std::sync::atomic::AtomicU64>,
    shutdown_rx: tokio::sync::watch::Receiver<bool>,
) -> Result<(), String> {
    let url = format!("ws://{address}");
    let (ws_stream, _) = tokio_tungstenite::connect_async(&url)
        .await
        .map_err(|e| format!("Failed to connect: {e}"))?;

    let id = peer_counter.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    tokio::spawn(super::peer::run(
        ws_stream,
        id,
        peers,
        outgoing_tx,
        incoming_tx,
        last_remote_hash,
        shutdown_rx,
    ));

    Ok(())
}
