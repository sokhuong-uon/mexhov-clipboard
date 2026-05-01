use super::{PeerMap, PendingConnection, PendingMap, SyncMessage, SyncMode};
use crate::crypto::{
    decode_pubkey, derive_shared_key, encode_pubkey, generate_keypair, HandshakeMessage,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::net::TcpListener;
use tokio::sync::{broadcast, RwLock};
use tokio_tungstenite::tungstenite::Message;

/// Time the operator has to approve an inbound connection request.
const APPROVAL_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(60);

/// Bind a TCP listener and spawn the accept loop. Returns the bound address.
#[allow(clippy::too_many_arguments)]
pub async fn spawn(
    port: u16,
    peers: PeerMap,
    pending: PendingMap,
    outgoing_tx: broadcast::Sender<SyncMessage>,
    incoming_tx: tokio::sync::mpsc::UnboundedSender<SyncMessage>,
    last_remote_hash: Arc<RwLock<Option<u64>>>,
    peer_counter: Arc<std::sync::atomic::AtomicU64>,
    shutdown_rx: tokio::sync::watch::Receiver<bool>,
    app: AppHandle,
    mode: Arc<RwLock<SyncMode>>,
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
                        Ok((stream, peer_addr)) => {
                            let pending = pending.clone();
                            let app2 = app.clone();
                            let peers2 = peers.clone();
                            let outgoing_tx2 = outgoing_tx.clone();
                            let incoming_tx2 = incoming_tx.clone();
                            let last_remote_hash2 = last_remote_hash.clone();
                            let peer_counter2 = peer_counter.clone();
                            let shutdown_rx2 = shutdown_rx.clone();
                            let mode2 = mode.clone();
                            tokio::spawn(async move {
                                let mut ws = match tokio_tungstenite::accept_async(stream).await {
                                    Ok(ws) => ws,
                                    Err(_) => return,
                                };

                                let key = match perform_handshake(
                                    &mut ws,
                                    peer_addr.to_string(),
                                    pending,
                                    &app2,
                                ).await {
                                    Ok(k) => k,
                                    Err(_) => {
                                        let _ = ws.close(None).await;
                                        return;
                                    }
                                };

                                let id = peer_counter2
                                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                                super::peer::run(
                                    ws,
                                    id,
                                    key,
                                    peers2,
                                    outgoing_tx2,
                                    incoming_tx2,
                                    last_remote_hash2,
                                    shutdown_rx2,
                                    app2,
                                    mode2,
                                ).await;
                            });
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

/// Read the client's `Connect`, ask the operator for approval via a Tauri
/// event, then either complete ECDH or send `ConnectRejected` and bail.
async fn perform_handshake<S>(
    ws: &mut S,
    peer_addr: String,
    pending: PendingMap,
    app: &AppHandle,
) -> Result<[u8; 32], String>
where
    S: StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>
        + SinkExt<Message>
        + Unpin,
{
    // 1. Wait for the client's Connect message (short timeout — no human in the loop yet).
    let msg = match tokio::time::timeout(std::time::Duration::from_secs(5), ws.next()).await {
        Ok(Some(Ok(Message::Text(text)))) => text,
        _ => return Err("no connect message".into()),
    };

    let handshake: HandshakeMessage =
        serde_json::from_str(&msg).map_err(|_| "bad handshake json")?;

    let (hostname, client_pubkey) = match handshake {
        HandshakeMessage::Connect { hostname, pubkey } => (hostname, pubkey),
        _ => return Err("expected Connect".into()),
    };

    let client_pk = decode_pubkey(&client_pubkey)?;

    // 2. Register a pending request and emit an event for the UI to confirm.
    let id = format!(
        "{}-{}",
        peer_addr,
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    );
    let (approval_tx, approval_rx) = tokio::sync::oneshot::channel::<bool>();
    pending.write().await.insert(id.clone(), approval_tx);

    let pending_payload = PendingConnection {
        id: id.clone(),
        address: peer_addr,
        hostname,
    };
    let _ = app.emit("sync-pending-connection", &pending_payload);

    // Tell the client we're waiting on the operator (best effort).
    if let Ok(p) = serde_json::to_string(&HandshakeMessage::ConnectPending) {
        let _ = ws.send(Message::Text(p.into())).await;
    }

    // 3. Wait for approve / reject (or timeout).
    let approved = match tokio::time::timeout(APPROVAL_TIMEOUT, approval_rx).await {
        Ok(Ok(v)) => v,
        _ => {
            // Make sure we don't leak the entry on timeout.
            pending.write().await.remove(&id);
            false
        }
    };

    let _ = app.emit("sync-pending-cleared", &id);

    if !approved {
        if let Ok(r) = serde_json::to_string(&HandshakeMessage::ConnectRejected) {
            let _ = ws.send(Message::Text(r.into())).await;
        }
        return Err("rejected by user".into());
    }

    // 4. Approved → finish ECDH.
    let (server_secret, server_pk) = generate_keypair();
    let approved_msg = serde_json::to_string(&HandshakeMessage::ConnectApproved {
        pubkey: encode_pubkey(&server_pk),
    })
    .map_err(|e| e.to_string())?;
    ws.send(Message::Text(approved_msg.into()))
        .await
        .map_err(|_| "failed to send approval".to_string())?;

    Ok(derive_shared_key(server_secret, &client_pk))
}
