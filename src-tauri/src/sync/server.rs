use super::crypto::{self, HandshakeMessage};
use super::{PeerMap, SyncMessage};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::{broadcast, RwLock};
use tokio_tungstenite::tungstenite::Message;

/// Bind a TCP listener and spawn the accept loop. Returns the bound address.
pub async fn spawn(
    port: u16,
    pairing_code: &str,
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

    let pairing_code = pairing_code.to_string();
    let mut shutdown = shutdown_rx.clone();
    tokio::spawn(async move {
        loop {
            tokio::select! {
                result = listener.accept() => {
                    match result {
                        Ok((stream, _)) => {
                            let mut ws = match tokio_tungstenite::accept_async(stream).await {
                                Ok(ws) => ws,
                                Err(_) => continue,
                            };

                            // ── Handshake: validate pairing code + ECDH ──
                            let handshake_result = tokio::time::timeout(
                                std::time::Duration::from_secs(5),
                                perform_handshake(&mut ws, &pairing_code),
                            ).await;

                            let key = match handshake_result {
                                Ok(Ok(k)) => k,
                                _ => {
                                    let _ = ws.close(None).await;
                                    continue;
                                }
                            };

                            let id = peer_counter
                                .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                            tokio::spawn(super::peer::run(
                                ws,
                                id,
                                key,
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

/// Validate pairing code and perform ECDH key exchange.
/// Returns the derived AES-256-GCM key on success.
async fn perform_handshake<S>(ws: &mut S, expected_code: &str) -> Result<[u8; 32], String>
where
    S: StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>
        + SinkExt<Message>
        + Unpin,
{
    // Read the auth message
    let msg = match ws.next().await {
        Some(Ok(Message::Text(text))) => text,
        _ => return Err("no auth message".into()),
    };

    let handshake: HandshakeMessage =
        serde_json::from_str(&msg).map_err(|_| "bad handshake json")?;

    match handshake {
        HandshakeMessage::Auth { code, pubkey } if code == expected_code => {
            let client_pk = crypto::decode_pubkey(&pubkey)?;

            // Generate server ephemeral keypair
            let (server_secret, server_pk) = crypto::generate_keypair();

            // Send AuthOk with server's public key
            let ok = serde_json::to_string(&HandshakeMessage::AuthOk {
                pubkey: crypto::encode_pubkey(&server_pk),
            })
            .map_err(|e| e.to_string())?;
            let _ = ws.send(Message::Text(ok.into())).await;

            // Derive shared secret → AES key
            let shared = server_secret.diffie_hellman(&client_pk);
            Ok(crypto::derive_key_from_shared_secret(shared.as_bytes()))
        }
        _ => Err("bad pairing code".into()),
    }
}
