use crate::sync::{SyncStartResult, SyncState, SyncStatus};
use tauri::{AppHandle, State};

#[derive(serde::Serialize, specta::Type)]
pub struct NetworkInterfaceInfo {
    pub name: String,
    pub ip: String,
}

#[tauri::command]
#[specta::specta]
pub fn get_local_ip() -> Result<String, String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket.connect("8.8.8.8:80").map_err(|e| e.to_string())?;
    let addr = socket.local_addr().map_err(|e| e.to_string())?;
    Ok(addr.ip().to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_network_interfaces() -> Vec<NetworkInterfaceInfo> {
    use network_interface::{NetworkInterface, NetworkInterfaceConfig};

    let Ok(interfaces) = NetworkInterface::show() else {
        return vec![];
    };

    let mut result = Vec::new();
    for iface in interfaces {
        for addr in &iface.addr {
            let ip = addr.ip();
            if ip.is_loopback() {
                continue;
            }
            if let std::net::IpAddr::V4(v4) = ip {
                result.push(NetworkInterfaceInfo {
                    name: iface.name.clone(),
                    ip: v4.to_string(),
                });
            }
        }
    }
    result
}

#[tauri::command]
#[specta::specta]
pub fn get_hostname() -> String {
    hostname::get()
        .ok()
        .and_then(|h| h.into_string().ok())
        .unwrap_or_else(|| "this device".to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn sync_start_server(
    port: u16,
    app: AppHandle,
    state: State<'_, SyncState>,
) -> Result<SyncStartResult, String> {
    state.start_server(port, app).await
}

#[tauri::command]
#[specta::specta]
pub async fn sync_connect(
    address: String,
    pairing_code: String,
    app: AppHandle,
    state: State<'_, SyncState>,
) -> Result<(), String> {
    state.connect(address, pairing_code, app).await
}

#[tauri::command]
#[specta::specta]
pub async fn sync_cloud_join(
    relay_url: String,
    auth_token: String,
    app: AppHandle,
    state: State<'_, SyncState>,
) -> Result<String, String> {
    state.cloud_join(relay_url, auth_token, app).await
}

#[tauri::command]
#[specta::specta]
pub async fn sync_stop(state: State<'_, SyncState>) -> Result<(), String> {
    state.stop().await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn sync_status(state: State<'_, SyncState>) -> Result<SyncStatus, String> {
    Ok(state.status().await)
}

#[tauri::command]
#[specta::specta]
pub async fn mdns_start_discovery(
    app: AppHandle,
    state: State<'_, SyncState>,
) -> Result<(), String> {
    state.mdns.lock().await.start_browsing(app)
}

#[tauri::command]
#[specta::specta]
pub async fn mdns_stop_discovery(state: State<'_, SyncState>) -> Result<(), String> {
    state.mdns.lock().await.stop_browsing();
    Ok(())
}
