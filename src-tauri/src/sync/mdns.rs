use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

const SERVICE_TYPE: &str = "_mexhovcp._tcp.local.";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredDevice {
    pub hostname: String,
    pub address: String,
    pub instance_name: String,
}

pub struct MdnsState {
    daemon: ServiceDaemon,
    registered_fullname: Option<String>,
    browse_shutdown: Option<tokio::sync::watch::Sender<bool>>,
}

impl MdnsState {
    pub fn new() -> Result<Self, String> {
        let daemon = ServiceDaemon::new().map_err(|e| format!("mDNS daemon failed: {e}"))?;
        Ok(Self {
            daemon,
            registered_fullname: None,
            browse_shutdown: None,
        })
    }

    pub fn register(&mut self, hostname: &str, port: u16) -> Result<(), String> {
        self.unregister();

        let my_addrs: Vec<String> = {
            use network_interface::{NetworkInterface, NetworkInterfaceConfig};
            let ifaces = NetworkInterface::show().unwrap_or_default();
            ifaces
                .iter()
                .flat_map(|iface| &iface.addr)
                .filter_map(|addr| {
                    let ip = addr.ip();
                    if ip.is_loopback() {
                        return None;
                    }
                    match ip {
                        std::net::IpAddr::V4(v4) => Some(v4.to_string()),
                        _ => None,
                    }
                })
                .collect()
        };

        if my_addrs.is_empty() {
            return Err("No network interfaces found".into());
        }

        let host_label = hostname.replace('.', "-");
        let host_fqdn = format!("{host_label}.local.");

        let service = ServiceInfo::new(
            SERVICE_TYPE,
            &host_label,
            &host_fqdn,
            my_addrs
                .iter()
                .map(|s| s.as_str())
                .collect::<Vec<_>>()
                .as_slice(),
            port,
            [("hostname", hostname)].as_ref(),
        )
        .map_err(|e| format!("mDNS ServiceInfo error: {e}"))?;

        let fullname = service.get_fullname().to_string();
        self.daemon
            .register(service)
            .map_err(|e| format!("mDNS register error: {e}"))?;
        self.registered_fullname = Some(fullname);
        Ok(())
    }

    pub fn unregister(&mut self) {
        if let Some(fullname) = self.registered_fullname.take() {
            let _ = self.daemon.unregister(&fullname);
        }
    }

    pub fn start_browsing(&mut self, app: AppHandle) -> Result<(), String> {
        self.stop_browsing();

        let receiver = self
            .daemon
            .browse(SERVICE_TYPE)
            .map_err(|e| format!("mDNS browse error: {e}"))?;

        let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(false);
        self.browse_shutdown = Some(shutdown_tx);

        // The receiver from mdns-sd is a flume channel — use spawn_blocking
        let own_fullname = self.registered_fullname.clone();
        tokio::task::spawn(async move {
            let receiver = Arc::new(Mutex::new(receiver));
            loop {
                let recv = receiver.clone();
                let result = tokio::select! {
                    r = async {
                        let rx = recv.lock().await;
                        // Use spawn_blocking so the sync recv doesn't block tokio
                        let rx_ref = rx.clone();
                        tokio::task::spawn_blocking(move || {
                            rx_ref.recv_timeout(std::time::Duration::from_millis(500))
                        }).await
                    } => {
                        match r {
                            Ok(Ok(event)) => Some(event),
                            Ok(Err(_)) => None, // timeout or disconnected
                            Err(_) => None,     // join error
                        }
                    }
                    _ = shutdown_rx.changed() => break,
                };

                let Some(event) = result else { continue };

                match event {
                    ServiceEvent::ServiceResolved(info) => {
                        // Skip our own service
                        if let Some(ref own) = own_fullname {
                            if info.get_fullname() == own {
                                continue;
                            }
                        }

                        let hostname = info
                            .get_properties()
                            .get("hostname")
                            .map(|v| v.val_str().to_string())
                            .unwrap_or_else(|| {
                                info.get_hostname().trim_end_matches('.').to_string()
                            });

                        let port = info.get_port();
                        // Pick first IPv4 address
                        let ip = info.get_addresses_v4().iter().next().map(|a| a.to_string());

                        if let Some(ip) = ip {
                            let device = DiscoveredDevice {
                                hostname,
                                address: format!("{ip}:{port}"),
                                instance_name: info.get_fullname().to_string(),
                            };
                            let _ = app.emit("mdns-device-found", &device);
                        }
                    }
                    ServiceEvent::ServiceRemoved(_, fullname) => {
                        let _ = app.emit("mdns-device-lost", &fullname);
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }

    pub fn stop_browsing(&mut self) {
        if let Some(tx) = self.browse_shutdown.take() {
            let _ = tx.send(true);
        }
        let _ = self.daemon.stop_browse(SERVICE_TYPE);
    }
}

impl Drop for MdnsState {
    fn drop(&mut self) {
        self.unregister();
        self.stop_browsing();
        let _ = self.daemon.shutdown();
    }
}
