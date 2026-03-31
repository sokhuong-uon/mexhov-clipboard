use super::{PeerMap, SyncMessage};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::{broadcast, RwLock};

/// Bind a TCP listener and spawn the accept loop.  Returns the bound address.
pub async fn spawn(
    port: u16,
    peers: PeerMap,
    outgoing_tx: broadcast::Sender<SyncMessage>,
    incoming_tx: tokio::sync::mpsc::UnboundedSender<SyncMessage>,
    last_remote_hash: Arc<RwLock<Option<u64>>>,
    peer_counter: Arc<std::sync::atomic::AtomicU64>,
    shutdown_rx: tokio::sync::watch::Receiver<bool>,
) -> Result<String, String> {
    let addr = format!("0.0.0.0:{port}");
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Failed to bind: {e}"))?;
    let local_addr = listener
        .local_addr()
        .map_err(|e| e.to_string())?
        .to_string();

    let mut shutdown = shutdown_rx.clone();
    tokio::spawn(async move {
        loop {
            tokio::select! {
                result = listener.accept() => {
                    match result {
                        Ok((stream, _)) => {
                            let ws = match tokio_tungstenite::accept_async(stream).await {
                                Ok(ws) => ws,
                                Err(_) => continue,
                            };
                            let id = peer_counter
                                .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                            tokio::spawn(super::peer::run(
                                ws,
                                id,
                                peers.clone(),
                                outgoing_tx.clone(),
                                incoming_tx.clone(),
                                last_remote_hash.clone(),
                                shutdown_rx.clone(),
                            ));
                        }
                        Err(_) => break,
                    }
                }
                _ = shutdown.changed() => break,
            }
        }
    });

    Ok(local_addr)
}
