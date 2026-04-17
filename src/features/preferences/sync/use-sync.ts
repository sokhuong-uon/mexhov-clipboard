import { useCallback, useEffect, useState } from "react";
import { commands } from "@/bindings";
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
    const result = await commands.syncStatus();
    if (result.status === "ok") {
      setStatus(result.data as SyncStatus);
    }
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
    commands.getNetworkInterfaces().then(setInterfaces).catch(() => {});
    commands.getHostname().then(setHostname).catch(() => {});
  }, []);

  const startServer = async () => {
    setError(null);
    setLoading(true);
    const result = await commands.syncStartServer(DEFAULT_SYNC_PORT);
    if (result.status === "error") {
      setError(String(result.error));
    } else {
      await refreshStatus();
    }
    setLoading(false);
  };

  const connectLan = async (address: string, pairingCode: string) => {
    setError(null);
    setLoading(true);
    const result = await commands.syncConnect(address, pairingCode);
    if (result.status === "error") {
      setError(String(result.error));
    } else {
      await refreshStatus();
    }
    setLoading(false);
  };

  const connectCloud = async (relayUrl: string, authToken: string) => {
    setError(null);
    setLoading(true);
    const result = await commands.syncCloudJoin(relayUrl, authToken);
    if (result.status === "error") {
      setError(String(result.error));
    } else {
      await refreshStatus();
    }
    setLoading(false);
  };

  const disconnect = async () => {
    await commands.syncStop();
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
