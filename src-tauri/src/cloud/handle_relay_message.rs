use tokio_tungstenite::tungstenite::Message;

use super::handle_key_exchange::handle_key_exchange;
use super::handle_key_exchange_ack::handle_key_exchange_ack;
use super::handle_peer_joined::handle_peer_joined;
use super::handle_peer_left::handle_peer_left;
use super::receive_broadcast_clipboard::receive_broadcast_clipboard;
use super::receive_direct_clipboard::receive_direct_clipboard;
use super::relay_message::RelayMessage;
use super::state::CloudState;

/// Route an incoming relay message to the right handler.
/// Returns a reply to send back to the relay, if any.
pub(crate) async fn handle_relay_message(
    state: &CloudState,
    msg: RelayMessage,
) -> Option<Message> {
    match msg {
        RelayMessage::PeerJoined { peer_id } => handle_peer_joined(state, peer_id).await,
        RelayMessage::PeerLeft { peer_id } => {
            handle_peer_left(state, peer_id).await;
            None
        }
        RelayMessage::KeyExchange { from, pubkey, .. } => {
            handle_key_exchange(state, from, pubkey).await
        }
        RelayMessage::KeyExchangeAck { from, pubkey, .. } => {
            handle_key_exchange_ack(state, from, pubkey).await;
            None
        }
        RelayMessage::Data { from, payload, .. } => {
            receive_direct_clipboard(state, from, payload).await;
            None
        }
        RelayMessage::Broadcast { from, payloads } => {
            receive_broadcast_clipboard(state, from, payloads).await;
            None
        }
        RelayMessage::Welcome { .. } => None,
    }
}
