use super::{emit_status, PeerMap, SyncMessage, SyncMode};
use crate::crypto::{open_envelope, seal_envelope};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::{broadcast, RwLock};
use tokio_tungstenite::tungstenite::Message;

/// Drive a single WebSocket peer: read from remote, forward local changes,
/// relay messages between peers (server mode), and respect shutdown.
/// All SyncMessage payloads are encrypted with AES-256-GCM.
pub async fn run<Stream>(
    ws_stream: Stream,
    peer_id: u64,
    key: [u8; 32],
    peers: PeerMap,
    outgoing_tx: broadcast::Sender<SyncMessage>,
    incoming_tx: tokio::sync::mpsc::UnboundedSender<SyncMessage>,
    last_remote_hash: Arc<RwLock<Option<u64>>>,
    mut shutdown_rx: tokio::sync::watch::Receiver<bool>,
    app: AppHandle,
    mode: Arc<RwLock<SyncMode>>,
) where
    Stream: StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>
        + SinkExt<Message>
        + Unpin
        + Send
        + 'static,
{
    let (tx, mut relay_rx) = tokio::sync::mpsc::unbounded_channel::<Message>();
    peers.write().await.insert(peer_id, tx);
    emit_status(&app, &*mode.read().await, peers.read().await.len());

    let (mut sink, mut stream) = ws_stream.split();
    let mut outgoing_rx = outgoing_tx.subscribe();

    loop {
        tokio::select! {
            // Remote → local (decrypt)
            msg = stream.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        // Decrypt the envelope
                        let plaintext = match open_envelope(&key, &text) {
                            Ok(p) => p,
                            Err(_) => continue, // bad decrypt, skip
                        };

                        if let Ok(sync_msg) = serde_json::from_str::<SyncMessage>(&plaintext) {
                            // Mark hash so the monitor won't re-broadcast this content
                            *last_remote_hash.write().await = Some(content_hash(&sync_msg));

                            // Relay encrypted ciphertext as-is to other peers (same key)
                            let peers_read = peers.read().await;
                            for (&pid, sender) in peers_read.iter() {
                                if pid != peer_id {
                                    let _ = sender.send(Message::Text(text.clone()));
                                }
                            }

                            let _ = incoming_tx.send(sync_msg);
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
            // Local clipboard change → remote (encrypt)
            msg = outgoing_rx.recv() => {
                if let Ok(sync_msg) = msg {
                    if let Ok(json) = serde_json::to_string(&sync_msg) {
                        if let Ok(encrypted) = seal_envelope(&key, &json) {
                            if sink.send(Message::Text(encrypted.into())).await.is_err() {
                                break;
                            }
                        }
                    }
                }
            }
            // Relayed message from another peer (already encrypted)
            msg = relay_rx.recv() => {
                match msg {
                    Some(m) => { if sink.send(m).await.is_err() { break; } }
                    None => break,
                }
            }
            // Shutdown
            _ = shutdown_rx.changed() => {
                let _ = sink.send(Message::Close(None)).await;
                break;
            }
        }
    }

    peers.write().await.remove(&peer_id);
    let remaining = peers.read().await.len();

    // If this was a client and its only peer (the server) disconnected, reset mode
    if remaining == 0 {
        let mut mode_lock = mode.write().await;
        if matches!(*mode_lock, SyncMode::LanClient { .. }) {
            *mode_lock = SyncMode::Off;
        }
        emit_status(&app, &mode_lock, 0);
    } else {
        emit_status(&app, &*mode.read().await, remaining);
    }
}

pub fn content_hash(msg: &SyncMessage) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    match msg {
        SyncMessage::Text { text } => {
            "text".hash(&mut hasher);
            text.hash(&mut hasher);
        }
        SyncMessage::Image { base64_data, .. } => {
            "image".hash(&mut hasher);
            base64_data.len().hash(&mut hasher);
            let b = base64_data.as_bytes();
            b[..b.len().min(64)].hash(&mut hasher);
            b[b.len().saturating_sub(64)..].hash(&mut hasher);
        }
    }
    hasher.finish()
}
