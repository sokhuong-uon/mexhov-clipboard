use super::{PeerMap, SyncMessage, SyncMode};
use crate::crypto::{
    decode_pubkey, derive_shared_key, encode_pubkey, generate_keypair, HandshakeMessage,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::{broadcast, RwLock};
use tokio_tungstenite::tungstenite::Message;

/// How long to wait for the remote operator to approve the connection.
const APPROVAL_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(60);

/// Connect to a remote WebSocket server and spawn the peer handler.
#[allow(clippy::too_many_arguments)]
pub async fn spawn(
    address: &str,
    hostname: &str,
    peers: PeerMap,
    outgoing_tx: broadcast::Sender<SyncMessage>,
    incoming_tx: tokio::sync::mpsc::UnboundedSender<SyncMessage>,
    last_remote_hash: Arc<RwLock<Option<u64>>>,
    peer_counter: Arc<std::sync::atomic::AtomicU64>,
    shutdown_rx: tokio::sync::watch::Receiver<bool>,
    app: AppHandle,
    mode: Arc<RwLock<SyncMode>>,
) -> Result<(), String> {
    let url = format!("ws://{address}");
    let (mut ws_stream, _) = tokio_tungstenite::connect_async(&url)
        .await
        .map_err(|e| format!("Failed to connect: {e}"))?;

    // Send Connect with our hostname and ephemeral public key.
    let (client_secret, client_pk) = generate_keypair();
    let connect = serde_json::to_string(&HandshakeMessage::Connect {
        hostname: hostname.to_string(),
        pubkey: encode_pubkey(&client_pk),
    })
    .map_err(|e| e.to_string())?;
    ws_stream
        .send(Message::Text(connect.into()))
        .await
        .map_err(|e| format!("Failed to send connect: {e}"))?;

    // Read handshake replies until we get Approved / Rejected (or time out).
    let key = loop {
        let next = tokio::time::timeout(APPROVAL_TIMEOUT, ws_stream.next())
            .await
            .map_err(|_| "Connection request timed out".to_string())?;

        match next {
            Some(Ok(Message::Text(text))) => {
                let msg: HandshakeMessage = serde_json::from_str(&text)
                    .map_err(|_| "Invalid handshake response".to_string())?;
                match msg {
                    HandshakeMessage::ConnectPending => continue,
                    HandshakeMessage::ConnectApproved { pubkey } => {
                        let server_pk = decode_pubkey(&pubkey)?;
                        break derive_shared_key(client_secret, &server_pk);
                    }
                    HandshakeMessage::ConnectRejected => {
                        return Err("Connection rejected by remote device".into());
                    }
                    _ => return Err("Unexpected handshake response".into()),
                }
            }
            Some(Ok(Message::Close(_))) | None => {
                return Err("Connection closed by remote device".into());
            }
            Some(Err(e)) => {
                return Err(format!("Handshake failed: {e}"));
            }
            _ => {}
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
        app,
        mode,
    ));

    Ok(())
}
