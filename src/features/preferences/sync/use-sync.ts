import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const DEFAULT_SYNC_PORT = 9876;

export type SyncMode = "off" | "lan-server" | "lan-client" | "cloud";

export type SyncStatus = {
  mode: SyncMode;
  address: string | null;
  pairingCode: string | null;
  roomId: string | null;
  connectedPeers: number;
};

export type NetworkInterface = {
  name: string;
  ip: string;
};

type SyncStartResult = {
  address: string;
  pairingCode: string;
};

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>({
    mode: "off",
    address: null,
    pairingCode: null,
    roomId: null,
    connectedPeers: 0,
  });
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [hostname, setHostname] = useState("this device");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await invoke<SyncStatus>("sync_status");
      setStatus(s);
    } catch {}
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 2000);
    const unlisten = listen<number>("sync-peer-changed", () => {
      refreshStatus();
    });
    return () => {
      clearInterval(interval);
      unlisten.then((fn) => fn());
    };
  }, [refreshStatus]);

  useEffect(() => {
    invoke<NetworkInterface[]>("get_network_interfaces")
      .then(setInterfaces)
      .catch(() => {});
    invoke<string>("get_hostname")
      .then(setHostname)
      .catch(() => {});
  }, []);

  const startServer = async () => {
    setError(null);
    setLoading(true);
    try {
      await invoke<SyncStartResult>("sync_start_server", {
        port: DEFAULT_SYNC_PORT,
      });
      await refreshStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const connectLan = async (address: string, pairingCode: string) => {
    setError(null);
    setLoading(true);
    try {
      await invoke("sync_connect", { address, pairingCode });
      await refreshStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const connectCloud = async (relayUrl: string, authToken: string) => {
    setError(null);
    setLoading(true);
    try {
      await invoke("sync_cloud_join", { relayUrl, authToken });
      await refreshStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    await invoke("sync_stop");
    await refreshStatus();
    setError(null);
  };

  const serverPort =
    status.address?.split(":").pop() ?? String(DEFAULT_SYNC_PORT);

  return {
    status,
    interfaces,
    hostname,
    serverPort,
    error,
    loading,
    startServer,
    connectLan,
    connectCloud,
    disconnect,
    clearError: () => setError(null),
  };
}
