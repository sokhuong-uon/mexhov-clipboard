mod client;
pub(crate) mod crypto;
mod peer;
mod server;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::{broadcast, Mutex, RwLock};
use tokio_tungstenite::tungstenite::Message;

pub use peer::content_hash;

// ── Wire protocol ──────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum SyncMessage {
    Text { text: String },
    Image { base64_data: String, width: u32, height: u32 },
}

// ── Status reported to the frontend ────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub mode: String, // "off" | "server" | "client"
    pub address: Option<String>,
    pub pairing_code: Option<String>,
    pub connected_peers: usize,
}

// ── Server start result ────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStartResult {
    pub address: String,
    pub pairing_code: String,
}

// ── Shared peer bookkeeping ────────────────────────────────────────

pub(crate) type PeerTx = tokio::sync::mpsc::UnboundedSender<Message>;
pub(crate) type PeerMap = Arc<RwLock<HashMap<u64, PeerTx>>>;

// ── Top-level managed state ────────────────────────────────────────

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
}

pub(crate) enum SyncMode {
    Off,
    Server {
        address: String,
        pairing_code: String,
        shutdown: tokio::sync::watch::Sender<bool>,
    },
    Client {
        address: String,
        shutdown: tokio::sync::watch::Sender<bool>,
    },
}

impl SyncState {
    pub fn new() -> Self {
        let (outgoing_tx, _) = broadcast::channel(64);
        let (incoming_tx, incoming_rx) = tokio::sync::mpsc::unbounded_channel();
        Self {
            outgoing_tx,
            incoming_tx,
            incoming_rx: Arc::new(Mutex::new(incoming_rx)),
            last_remote_hash: Arc::new(RwLock::new(None)),
            mode: Arc::new(RwLock::new(SyncMode::Off)),
            peers: Arc::new(RwLock::new(HashMap::new())),
            peer_counter: Arc::new(std::sync::atomic::AtomicU64::new(0)),
        }
    }

    pub async fn status(&self) -> SyncStatus {
        let mode = self.mode.read().await;
        let peer_count = self.peers.read().await.len();
        match &*mode {
            SyncMode::Off => SyncStatus {
                mode: "off".into(),
                address: None,
                pairing_code: None,
                connected_peers: peer_count,
            },
            SyncMode::Server {
                address,
                pairing_code,
                ..
            } => SyncStatus {
                mode: "server".into(),
                address: Some(address.clone()),
                pairing_code: Some(pairing_code.clone()),
                connected_peers: peer_count,
            },
            SyncMode::Client { address, .. } => SyncStatus {
                mode: "client".into(),
                address: Some(address.clone()),
                pairing_code: None,
                connected_peers: peer_count,
            },
        }
    }

    pub async fn start_server(&self, port: u16, app: AppHandle) -> Result<SyncStartResult, String> {
        self.stop().await;

        let pairing_code = crypto::generate_pairing_code();
        let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

        let local_addr = server::spawn(
            port,
            &pairing_code,
            self.peers.clone(),
            self.outgoing_tx.clone(),
            self.incoming_tx.clone(),
            self.last_remote_hash.clone(),
            self.peer_counter.clone(),
            shutdown_rx,
            app,
            self.mode.clone(),
        )
        .await?;

        *self.mode.write().await = SyncMode::Server {
            address: local_addr.clone(),
            pairing_code: pairing_code.clone(),
            shutdown: shutdown_tx,
        };

        Ok(SyncStartResult {
            address: local_addr,
            pairing_code,
        })
    }

    pub async fn connect(&self, address: String, pairing_code: String, app: AppHandle) -> Result<(), String> {
        self.stop().await;

        let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

        client::spawn(
            &address,
            &pairing_code,
            self.peers.clone(),
            self.outgoing_tx.clone(),
            self.incoming_tx.clone(),
            self.last_remote_hash.clone(),
            self.peer_counter.clone(),
            shutdown_rx,
            app,
            self.mode.clone(),
        )
        .await?;

        *self.mode.write().await = SyncMode::Client {
            address,
            shutdown: shutdown_tx,
        };
        Ok(())
    }

    pub async fn stop(&self) {
        let prev = std::mem::replace(&mut *self.mode.write().await, SyncMode::Off);
        if let SyncMode::Server { shutdown, .. } | SyncMode::Client { shutdown, .. } = prev {
            let _ = shutdown.send(true);
        }
        self.peers.write().await.clear();
    }

    /// Called by the clipboard monitor when local clipboard changes.
    pub fn broadcast(&self, msg: SyncMessage) {
        let _ = self.outgoing_tx.send(msg);
    }
}
