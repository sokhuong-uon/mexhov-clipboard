/// Per-peer encryption state after ECDH completes.
pub(crate) struct PeerKey {
    pub key: [u8; 32],
}
