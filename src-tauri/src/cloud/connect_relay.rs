use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};
use futures_util::StreamExt;

use super::relay_message::RelayMessage;

/// WebSocket stream type returned by `tokio_tungstenite::connect_async`.
pub(crate) type RelayStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

/// Connect to the cloud relay, then read the initial `Welcome` message.
/// Returns the live stream along with our assigned peer id and room id.
pub(crate) async fn connect_relay(
    relay_url: &str,
    auth_token: &str,
) -> Result<(RelayStream, String, String), String> {
    let url = format!("{relay_url}?token={auth_token}");
    let (mut ws_stream, _) = tokio_tungstenite::connect_async(&url)
        .await
        .map_err(|e| format!("Failed to connect to cloud relay: {e}"))?;

    let welcome = tokio::time::timeout(std::time::Duration::from_secs(10), ws_stream.next())
        .await
        .map_err(|_| "Cloud relay handshake timed out".to_string())?;

    let (peer_id, room_id) = match welcome {
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

    Ok((ws_stream, peer_id, room_id))
}
