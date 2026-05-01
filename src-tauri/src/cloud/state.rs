use std::collections::HashMap;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::{mpsc, RwLock};
use x25519_dalek::EphemeralSecret;

use crate::sync::{SyncMessage, SyncMode};

use super::peer_key::PeerKey;

/// Shared state for one cloud relay session. Each handler borrows this
/// immutably and reaches into the inner `Arc<RwLock<…>>`s for mutation.
pub(crate) struct CloudState {
    pub my_peer_id: String,
    pub peer_keys: Arc<RwLock<HashMap<String, PeerKey>>>,
    /// Secrets we've sent in a `KeyExchange` and are awaiting an `Ack` for.
    /// Stored separately because `EphemeralSecret` is consumed on `diffie_hellman`.
    pub pending_secrets: Arc<RwLock<HashMap<String, EphemeralSecret>>>,
    pub last_remote_hash: Arc<RwLock<Option<u64>>>,
    pub incoming_tx: mpsc::UnboundedSender<SyncMessage>,
    pub app: AppHandle,
    pub mode: Arc<RwLock<SyncMode>>,
}
