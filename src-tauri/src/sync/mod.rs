mod client;
pub(crate) mod mdns;
mod peer;
mod server;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::{broadcast, Mutex, RwLock};
use tokio_tungstenite::tungstenite::Message;

pub use peer::content_hash;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum SyncMessage {
    Text {
        text: String,
    },
    Image {
        base64_data: String,
        width: u32,
        height: u32,
    },
}

#[derive(Clone, Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub mode: String, // "off" | "lan-server" | "lan-client" | "cloud"
    pub address: Option<String>,
    pub room_id: Option<String>,
    pub connected_peers: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncStartResult {
    pub address: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PendingConnection {
    pub id: String,
    pub address: String,
    pub hostname: String,
}

pub(crate) type PendingMap = Arc<RwLock<HashMap<String, tokio::sync::oneshot::Sender<bool>>>>;

pub(crate) type PeerTx = tokio::sync::mpsc::UnboundedSender<Message>;
pub(crate) type PeerMap = Arc<RwLock<HashMap<u64, PeerTx>>>;

pub struct SyncState {
    /// Local clipboard changes are broadcast here → sent to all peers.
    pub outgoing_tx: broadcast::Sender<SyncMessage>,
    /// Remote clipboard changes arrive here → consumed by the monitor.
    pub incoming_tx: tokio::sync::mpsc::UnboundedSender<SyncMessage>,
    pub incoming_rx: Arc<Mutex<tokio::sync::mpsc::UnboundedReceiver<SyncMessage>>>,
    /// Hash of last remote content — the monitor checks this to avoid echo.
    pub last_remote_hash: Arc<RwLock<Option<u64>>>,

    mode: Arc<RwLock<SyncMode>>,
    peers: PeerMap,
    peer_counter: Arc<std::sync::atomic::AtomicU64>,
    pending: PendingMap,
    pub mdns: Arc<tokio::sync::Mutex<mdns::MdnsState>>,
}

#[allow(dead_code)]
pub(crate) enum SyncMode {
    Off,
    LanServer {
        address: String,
        shutdown: tokio::sync::watch::Sender<bool>,
    },
    LanClient {
        address: String,
        shutdown: tokio::sync::watch::Sender<bool>,
    },
    Cloud {
        room_id: String,
        shutdown: tokio::sync::watch::Sender<bool>,
    },
}

pub(crate) fn build_status(mode: &SyncMode, peer_count: usize) -> SyncStatus {
    match mode {
        SyncMode::Off => SyncStatus {
            mode: "off".into(),
            address: None,
            room_id: None,
            connected_peers: peer_count,
        },
        SyncMode::LanServer { address, .. } => SyncStatus {
            mode: "lan-server".into(),
            address: Some(address.clone()),
            room_id: None,
            connected_peers: peer_count,
        },
        SyncMode::LanClient { address, .. } => SyncStatus {
            mode: "lan-client".into(),
            address: Some(address.clone()),
            room_id: None,
            connected_peers: peer_count,
        },
        SyncMode::Cloud { room_id, .. } => SyncStatus {
            mode: "cloud".into(),
            address: None,
            room_id: Some(room_id.clone()),
            connected_peers: peer_count,
        },
    }
}

pub(crate) fn emit_status(app: &AppHandle, mode: &SyncMode, peer_count: usize) {
    let status = build_status(mode, peer_count);
    if let Err(e) = app.emit("sync-status-changed", status) {
        eprintln!("failed to emit sync status: {e}");
    }
}

impl SyncState {
    pub fn new() -> Self {
        let (outgoing_tx, _) = broadcast::channel(64);
        let (incoming_tx, incoming_rx) = tokio::sync::mpsc::unbounded_channel();
        let mdns = mdns::MdnsState::new().expect("failed to initialize mDNS daemon");
        Self {
            outgoing_tx,
            incoming_tx,
            incoming_rx: Arc::new(Mutex::new(incoming_rx)),
            last_remote_hash: Arc::new(RwLock::new(None)),
            mode: Arc::new(RwLock::new(SyncMode::Off)),
            peers: Arc::new(RwLock::new(HashMap::new())),
            peer_counter: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            pending: Arc::new(RwLock::new(HashMap::new())),
            mdns: Arc::new(tokio::sync::Mutex::new(mdns)),
        }
    }

    pub async fn start_server(&self, port: u16, app: AppHandle) -> Result<SyncStartResult, String> {
        self.stop(&app).await;

        let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

        let local_addr = server::spawn(
            port,
            self.peers.clone(),
            self.pending.clone(),
            self.outgoing_tx.clone(),
            self.incoming_tx.clone(),
            self.last_remote_hash.clone(),
            self.peer_counter.clone(),
            shutdown_rx,
            app.clone(),
            self.mode.clone(),
        )
        .await?;

        // Advertise via mDNS so other devices can discover us
        let hostname = hostname::get()
            .ok()
            .and_then(|h| h.into_string().ok())
            .unwrap_or_else(|| "unknown".to_string());
        if let Err(e) = self.mdns.lock().await.register(&hostname, port) {
            eprintln!("mDNS registration failed (non-fatal): {e}");
        }

        let new_mode = SyncMode::LanServer {
            address: local_addr.clone(),
            shutdown: shutdown_tx,
        };
        emit_status(&app, &new_mode, 0);
        *self.mode.write().await = new_mode;

        Ok(SyncStartResult {
            address: local_addr,
        })
    }

    pub async fn connect(&self, address: String, app: AppHandle) -> Result<(), String> {
        self.stop(&app).await;

        let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

        let hostname = hostname::get()
            .ok()
            .and_then(|h| h.into_string().ok())
            .unwrap_or_else(|| "unknown device".to_string());

        client::spawn(
            &address,
            &hostname,
            self.peers.clone(),
            self.outgoing_tx.clone(),
            self.incoming_tx.clone(),
            self.last_remote_hash.clone(),
            self.peer_counter.clone(),
            shutdown_rx,
            app.clone(),
            self.mode.clone(),
        )
        .await?;

        let new_mode = SyncMode::LanClient {
            address,
            shutdown: shutdown_tx,
        };
        emit_status(&app, &new_mode, self.peers.read().await.len());
        *self.mode.write().await = new_mode;
        Ok(())
    }

    pub async fn cloud_join(
        &self,
        relay_url: String,
        auth_token: String,
        app: AppHandle,
    ) -> Result<String, String> {
        self.stop(&app).await;

        let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

        let room_id = crate::cloud::spawn(
            &relay_url,
            &auth_token,
            self.outgoing_tx.clone(),
            self.incoming_tx.clone(),
            self.last_remote_hash.clone(),
            shutdown_rx,
            app.clone(),
            self.mode.clone(),
        )
        .await?;

        let new_mode = SyncMode::Cloud {
            room_id: room_id.clone(),
            shutdown: shutdown_tx,
        };
        emit_status(&app, &new_mode, 0);
        *self.mode.write().await = new_mode;

        Ok(room_id)
    }

    pub async fn stop(&self, app: &AppHandle) {
        self.mdns.lock().await.unregister();

        let prev = std::mem::replace(&mut *self.mode.write().await, SyncMode::Off);
        if let SyncMode::LanServer { shutdown, .. }
        | SyncMode::LanClient { shutdown, .. }
        | SyncMode::Cloud { shutdown, .. } = prev
        {
            let _ = shutdown.send(true);
        }
        // Reject any pending inbound connections waiting for approval.
        for (_, tx) in self.pending.write().await.drain() {
            let _ = tx.send(false);
        }
        self.peers.write().await.clear();
        emit_status(app, &SyncMode::Off, 0);
    }

    /// Approve an inbound LAN connection request waiting in the pending map.
    pub async fn approve_pending(&self, id: &str) -> Result<(), String> {
        let tx = self
            .pending
            .write()
            .await
            .remove(id)
            .ok_or_else(|| "Pending request not found".to_string())?;
        tx.send(true)
            .map_err(|_| "Pending request expired".to_string())
    }

    /// Reject an inbound LAN connection request waiting in the pending map.
    pub async fn reject_pending(&self, id: &str) -> Result<(), String> {
        let tx = self
            .pending
            .write()
            .await
            .remove(id)
            .ok_or_else(|| "Pending request not found".to_string())?;
        tx.send(false)
            .map_err(|_| "Pending request expired".to_string())
    }

    /// Called by the clipboard monitor when local clipboard changes.
    pub fn broadcast(&self, msg: SyncMessage) {
        let _ = self.outgoing_tx.send(msg);
    }
}
