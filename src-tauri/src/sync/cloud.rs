use super::crypto::{self, EncryptedEnvelope};
use super::{SyncMessage, SyncMode};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::{broadcast, RwLock};
use tokio_tungstenite::tungstenite::Message;

/// Messages exchanged over the cloud relay (before encryption).
/// The relay forwards these as-is; encryption is end-to-end between peers.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum RelayMessage {
    /// Relay tells us our peer ID and room info.
    Welcome { peer_id: String, room_id: String },
    /// Relay notifies a new peer joined.
    PeerJoined { peer_id: String },
    /// Relay notifies a peer left.
    PeerLeft { peer_id: String },
    /// Key exchange: send our public key to a specific peer.
    KeyExchange {
        from: String,
        to: String,
        pubkey: String,
    },
    /// Key exchange acknowledgement with the responder's public key.
    KeyExchangeAck {
        from: String,
        to: String,
        pubkey: String,
    },
    /// Encrypted data message routed to a specific peer.
    Data {
        from: String,
        to: String,
        payload: String, // EncryptedEnvelope JSON
    },
    /// Broadcast data to all peers (each copy encrypted with per-peer key).
    Broadcast {
        from: String,
        payloads: HashMap<String, String>, // peer_id -> EncryptedEnvelope JSON
    },
}

/// Per-peer encryption state after ECDH completes.
struct PeerKey {
    key: [u8; 32],
}

/// Connect to the cloud relay and handle multi-peer encrypted sync.
pub async fn spawn(
    relay_url: &str,
    auth_token: &str,
    outgoing_tx: broadcast::Sender<SyncMessage>,
    incoming_tx: tokio::sync::mpsc::UnboundedSender<SyncMessage>,
    last_remote_hash: Arc<RwLock<Option<u64>>>,
    mut shutdown_rx: tokio::sync::watch::Receiver<bool>,
    app: AppHandle,
    mode: Arc<RwLock<SyncMode>>,
) -> Result<String, String> {
    // Connect with auth token in the URL query or header
    let url = format!("{relay_url}?token={auth_token}");
    let (mut ws_stream, _) = tokio_tungstenite::connect_async(&url)
        .await
        .map_err(|e| format!("Failed to connect to cloud relay: {e}"))?;

    // Wait for Welcome message from relay
    let welcome = tokio::time::timeout(std::time::Duration::from_secs(10), ws_stream.next())
        .await
        .map_err(|_| "Cloud relay handshake timed out".to_string())?;

    let (my_peer_id, room_id) = match welcome {
        Some(Ok(Message::Text(text))) => {
            let msg: RelayMessage =
                serde_json::from_str(&text).map_err(|_| "Invalid welcome message".to_string())?;
            match msg {
                RelayMessage::Welcome { peer_id, room_id } => (peer_id, room_id),
                _ => return Err("Expected welcome message".to_string()),
            }
        }
        Some(Ok(Message::Close(_))) | None => {
            return Err("Connection closed during handshake".to_string());
        }
        Some(Err(e)) => return Err(format!("WebSocket error: {e}")),
        _ => return Err("Unexpected message during handshake".to_string()),
    };

    let room_id_clone = room_id.clone();
    let mut outgoing_rx = outgoing_tx.subscribe();

    // Per-peer keys: peer_id -> AES key (established via ECDH)
    let peer_keys: Arc<RwLock<HashMap<String, PeerKey>>> = Arc::new(RwLock::new(HashMap::new()));
    // Pending key exchanges: we initiated ECDH but haven't received ack yet
    // Store our secret so we can compute shared secret on ack
    // Since EphemeralSecret is consumed on diffie_hellman, we store a fresh one per peer
    let pending_secrets: Arc<RwLock<HashMap<String, x25519_dalek::EphemeralSecret>>> =
        Arc::new(RwLock::new(HashMap::new()));

    tokio::spawn(async move {
        let (mut sink, mut stream) = ws_stream.split();

        loop {
            tokio::select! {
                // Messages from relay
                msg = stream.next() => {
                    match msg {
                        Some(Ok(Message::Text(text))) => {
                            let relay_msg = match serde_json::from_str::<RelayMessage>(&text) {
                                Ok(m) => m,
                                Err(_) => continue,
                            };

                            match relay_msg {
                                RelayMessage::PeerJoined { peer_id } => {
                                    // Initiate ECDH with the new peer
                                    let (secret, pk) = crypto::generate_keypair();
                                    let ke = RelayMessage::KeyExchange {
                                        from: my_peer_id.clone(),
                                        to: peer_id.clone(),
                                        pubkey: crypto::encode_pubkey(&pk),
                                    };
                                    if let Ok(json) = serde_json::to_string(&ke) {
                                        if sink.send(Message::Text(json.into())).await.is_err() {
                                            break;
                                        }
                                    }
                                    pending_secrets.write().await.insert(peer_id, secret);
                                    emit_peer_count(&app, peer_keys.read().await.len() + 1);
                                }

                                RelayMessage::PeerLeft { peer_id } => {
                                    peer_keys.write().await.remove(&peer_id);
                                    pending_secrets.write().await.remove(&peer_id);
                                    emit_peer_count(&app, peer_keys.read().await.len());
                                }

                                RelayMessage::KeyExchange { from, pubkey, .. } => {
                                    // Someone wants to exchange keys with us — respond
                                    let their_pk = match crypto::decode_pubkey(&pubkey) {
                                        Ok(pk) => pk,
                                        Err(_) => continue,
                                    };
                                    let (our_secret, our_pk) = crypto::generate_keypair();
                                    let shared = our_secret.diffie_hellman(&their_pk);
                                    let key = crypto::derive_key_from_shared_secret(shared.as_bytes());

                                    peer_keys.write().await.insert(from.clone(), PeerKey { key });

                                    let ack = RelayMessage::KeyExchangeAck {
                                        from: my_peer_id.clone(),
                                        to: from,
                                        pubkey: crypto::encode_pubkey(&our_pk),
                                    };
                                    if let Ok(json) = serde_json::to_string(&ack) {
                                        if sink.send(Message::Text(json.into())).await.is_err() {
                                            break;
                                        }
                                    }
                                    emit_peer_count(&app, peer_keys.read().await.len());
                                }

                                RelayMessage::KeyExchangeAck { from, pubkey, .. } => {
                                    // Our key exchange was acknowledged
                                    let their_pk = match crypto::decode_pubkey(&pubkey) {
                                        Ok(pk) => pk,
                                        Err(_) => continue,
                                    };
                                    if let Some(secret) = pending_secrets.write().await.remove(&from) {
                                        let shared = secret.diffie_hellman(&their_pk);
                                        let key = crypto::derive_key_from_shared_secret(shared.as_bytes());
                                        peer_keys.write().await.insert(from, PeerKey { key });
                                        emit_peer_count(&app, peer_keys.read().await.len());
                                    }
                                }

                                RelayMessage::Data { from, payload, .. } => {
                                    // Decrypt with per-peer key
                                    let keys = peer_keys.read().await;
                                    if let Some(peer_key) = keys.get(&from) {
                                        if let Ok(plaintext) = EncryptedEnvelope::open(&peer_key.key, &payload) {
                                            if let Ok(sync_msg) = serde_json::from_str::<SyncMessage>(&plaintext) {
                                                *last_remote_hash.write().await = Some(super::content_hash(&sync_msg));
                                                let _ = incoming_tx.send(sync_msg);
                                            }
                                        }
                                    }
                                }

                                RelayMessage::Broadcast { from, payloads } => {
                                    // Find our payload and decrypt
                                    if let Some(payload) = payloads.get(&my_peer_id) {
                                        let keys = peer_keys.read().await;
                                        if let Some(peer_key) = keys.get(&from) {
                                            if let Ok(plaintext) = EncryptedEnvelope::open(&peer_key.key, payload) {
                                                if let Ok(sync_msg) = serde_json::from_str::<SyncMessage>(&plaintext) {
                                                    *last_remote_hash.write().await = Some(super::content_hash(&sync_msg));
                                                    let _ = incoming_tx.send(sync_msg);
                                                }
                                            }
                                        }
                                    }
                                }

                                RelayMessage::Welcome { .. } => {} // already handled
                            }
                        }
                        Some(Ok(Message::Close(_))) | None => break,
                        _ => {}
                    }
                }

                // Local clipboard change → encrypt and broadcast to all peers
                msg = outgoing_rx.recv() => {
                    if let Ok(sync_msg) = msg {
                        if let Ok(json) = serde_json::to_string(&sync_msg) {
                            let keys = peer_keys.read().await;
                            if keys.is_empty() {
                                continue;
                            }

                            let mut payloads = HashMap::new();
                            for (peer_id, peer_key) in keys.iter() {
                                if let Ok(encrypted) = EncryptedEnvelope::seal(&peer_key.key, &json) {
                                    payloads.insert(peer_id.clone(), encrypted);
                                }
                            }
                            drop(keys);

                            let broadcast = RelayMessage::Broadcast {
                                from: my_peer_id.clone(),
                                payloads,
                            };
                            if let Ok(msg_json) = serde_json::to_string(&broadcast) {
                                if sink.send(Message::Text(msg_json.into())).await.is_err() {
                                    break;
                                }
                            }
                        }
                    }
                }

                // Shutdown
                _ = shutdown_rx.changed() => {
                    let _ = sink.send(Message::Close(None)).await;
                    break;
                }
            }
        }

        // Cleanup
        peer_keys.write().await.clear();
        emit_peer_count(&app, 0);

        let mut mode_lock = mode.write().await;
        if matches!(*mode_lock, SyncMode::Cloud { .. }) {
            *mode_lock = SyncMode::Off;
        }
    });

    Ok(room_id_clone)
}

fn emit_peer_count(app: &AppHandle, count: usize) {
    if let Err(e) = app.emit("sync-peer-changed", count) {
        eprintln!("failed to emit peer count: {e}");
    }
}
