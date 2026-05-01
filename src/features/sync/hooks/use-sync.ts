import { useEffect, useState } from "react";
import { commands } from "@/bindings";
import { listen } from "@tauri-apps/api/event";

const DEFAULT_SYNC_PORT = 9876;

export type SyncMode = "off" | "lan-server" | "lan-client";

export type SyncStatus = {
  mode: SyncMode;
  address: string | null;
  roomId: string | null;
  connectedPeers: number;
};

export type NetworkInterface = {
  name: string;
  ip: string;
};

export type PendingConnection = {
  id: string;
  address: string;
  hostname: string;
};

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>({
    mode: "off",
    address: null,
    roomId: null,
    connectedPeers: 0,
  });
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [hostname, setHostname] = useState("this device");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingConnection | null>(null);

  useEffect(() => {
    const unlistenStatus = listen<SyncStatus>("sync-status-changed", (e) => {
      setStatus(e.payload);
    });
    const unlistenPending = listen<PendingConnection>(
      "sync-pending-connection",
      (e) => {
        setPending(e.payload);
      },
    );
    const unlistenCleared = listen<string>("sync-pending-cleared", (e) => {
      setPending((curr) => (curr && curr.id === e.payload ? null : curr));
    });
    return () => {
      unlistenStatus.then((fn) => fn());
      unlistenPending.then((fn) => fn());
      unlistenCleared.then((fn) => fn());
    };
  }, []);

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
    }
    setLoading(false);
  };

  const connectLan = async (address: string) => {
    setError(null);
    setLoading(true);
    const result = await commands.syncConnect(address);
    if (result.status === "error") {
      setError(String(result.error));
    }
    setLoading(false);
  };

  const connectCloud = async (relayUrl: string, authToken: string) => {
    setError(null);
    setLoading(true);
    const result = await commands.syncCloudJoin(relayUrl, authToken);
    if (result.status === "error") {
      setError(String(result.error));
    }
    setLoading(false);
  };

  const disconnect = async () => {
    await commands.syncStop();
    setError(null);
  };

  const approvePending = async () => {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    const result = await commands.syncApproveConnection(id);
    if (result.status === "error") {
      setError(String(result.error));
    }
  };

  const rejectPending = async () => {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    await commands.syncRejectConnection(id);
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
    pending,
    startServer,
    connectLan,
    connectCloud,
    disconnect,
    approvePending,
    rejectPending,
    clearError: () => setError(null),
  };
}
