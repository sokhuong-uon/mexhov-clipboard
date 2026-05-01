use futures_util::{SinkExt, StreamExt};
use tokio::sync::{broadcast, watch};
use tokio_tungstenite::tungstenite::Message;

use crate::sync::{emit_status, SyncMessage, SyncMode};

use super::broadcast_local_change::broadcast_local_change;
use super::connect_relay::RelayStream;
use super::handle_relay_message::handle_relay_message;
use super::relay_message::RelayMessage;
use super::state::CloudState;

/// The session's main event loop. Pumps three sources until any of them
/// closes: the relay stream, our local clipboard broadcast, and shutdown.
/// Cleans up peer state and emits a final off-status on exit.
pub(crate) async fn run_event_loop(
    state: CloudState,
    ws_stream: RelayStream,
    mut outgoing_rx: broadcast::Receiver<SyncMessage>,
    mut shutdown_rx: watch::Receiver<bool>,
) {
    let (mut sink, mut stream) = ws_stream.split();

    loop {
        tokio::select! {
            msg = stream.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        let Ok(relay_msg) = serde_json::from_str::<RelayMessage>(&text) else {
                            continue;
                        };
                        if let Some(reply) = handle_relay_message(&state, relay_msg).await {
                            if sink.send(reply).await.is_err() {
                                break;
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }

            msg = outgoing_rx.recv() => {
                if let Ok(sync_msg) = msg {
                    if let Some(reply) = broadcast_local_change(&state, sync_msg).await {
                        if sink.send(reply).await.is_err() {
                            break;
                        }
                    }
                }
            }

            _ = shutdown_rx.changed() => {
                let _ = sink.send(Message::Close(None)).await;
                break;
            }
        }
    }

    state.peer_keys.write().await.clear();

    let mut mode_lock = state.mode.write().await;
    if matches!(*mode_lock, SyncMode::Cloud { .. }) {
        *mode_lock = SyncMode::Off;
    }
    emit_status(&state.app, &mode_lock, 0);
}
