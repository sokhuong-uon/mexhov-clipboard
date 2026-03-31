use super::crypto::{self, HandshakeMessage};
use super::{PeerMap, SyncMessage};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tokio_tungstenite::tungstenite::Message;

/// Connect to a remote WebSocket server and spawn the peer handler.
pub async fn spawn(
    address: &str,
    pairing_code: &str,
    peers: PeerMap,
    outgoing_tx: broadcast::Sender<SyncMessage>,
    incoming_tx: tokio::sync::mpsc::UnboundedSender<SyncMessage>,
    last_remote_hash: Arc<RwLock<Option<u64>>>,
    peer_counter: Arc<std::sync::atomic::AtomicU64>,
    shutdown_rx: tokio::sync::watch::Receiver<bool>,
) -> Result<(), String> {
    let url = format!("ws://{address}");
    let (mut ws_stream, _) = tokio_tungstenite::connect_async(&url)
        .await
        .map_err(|e| format!("Failed to connect: {e}"))?;

    // ── Handshake: send pairing code + ephemeral public key ──
    let (client_secret, client_pk) = crypto::generate_keypair();

    let auth = serde_json::to_string(&HandshakeMessage::Auth {
        code: pairing_code.to_string(),
        pubkey: crypto::encode_pubkey(&client_pk),
    })
    .map_err(|e| e.to_string())?;
    ws_stream
        .send(Message::Text(auth.into()))
        .await
        .map_err(|e| format!("Failed to send auth: {e}"))?;

    // Wait for AuthOk with server's public key
    let response = tokio::time::timeout(std::time::Duration::from_secs(5), ws_stream.next())
        .await
        .map_err(|_| "Pairing handshake timed out".to_string())?;

    let key = match response {
        Some(Ok(Message::Text(text))) => {
            let msg: HandshakeMessage = serde_json::from_str(&text)
                .map_err(|_| "Invalid handshake response".to_string())?;
            match msg {
                HandshakeMessage::AuthOk { pubkey } => {
                    let server_pk = crypto::decode_pubkey(&pubkey)?;
                    let shared = client_secret.diffie_hellman(&server_pk);
                    crypto::derive_key_from_shared_secret(shared.as_bytes())
                }
                _ => return Err("Pairing code rejected".to_string()),
            }
        }
        Some(Ok(Message::Close(_))) | None => {
            return Err("Pairing code rejected".to_string());
        }
        Some(Err(e)) => {
            return Err(format!("Handshake failed: {e}"));
        }
        _ => {
            return Err("Unexpected handshake response".to_string());
        }
    };

    let id = peer_counter.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    tokio::spawn(super::peer::run(
        ws_stream,
        id,
        key,
        peers,
        outgoing_tx,
        incoming_tx,
        last_remote_hash,
        shutdown_rx,
    ));

    Ok(())
}
