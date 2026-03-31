import { useCallback, useEffect, useRef, useState } from "react";
import {
  CirclePlay,
  Copy,
  ArrowRight,
  Pin,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { QRCodeSVG } from "qrcode.react";
import { SystemInfo } from "@/types/clipboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const HISTORY_LIMIT_OPTIONS = [25, 50, 100, 200, 500] as const;
const DEFAULT_SYNC_PORT = 9876;

type SyncStatus = {
  mode: "off" | "server" | "client";
  address: string | null;
  pairingCode: string | null;
  connectedPeers: number;
};

type SyncStartResult = {
  address: string;
  pairingCode: string;
};

type ClipboardHeaderProps = {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  hasHistory: boolean;
  onClearAll: () => void;
  systemInfo: SystemInfo;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  historyLimit: number;
  onHistoryLimitChange: (limit: number) => void;
  favoritesFirst: boolean;
  onToggleFavoritesFirst: () => void;
};

export const ClipboardHeader = ({
  isMonitoring,
  onToggleMonitoring,
  hasHistory,
  onClearAll,
  systemInfo,
  searchQuery,
  onSearchChange,
  historyLimit,
  onHistoryLimitChange,
  favoritesFirst,
  onToggleFavoritesFirst,
}: ClipboardHeaderProps) => {
  const searchRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useHotkey(
    "Mod+K",
    () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    },
    { ignoreInputs: false },
  );

  useHotkey(
    "I",
    () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    },
    { ignoreInputs: false },
  );

  return (
    <header className="flex items-center gap-2 px-4 pb-2 pt-1 group/header">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={searchRef}
          type="search"
          placeholder="Search clipboard…"
          aria-label="Search clipboard history"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8"
        />
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(
          "shrink-0 text-neutral-400 dark:text-neutral-600",
          favoritesFirst && "text-amber-500",
        )}
        onClick={onToggleFavoritesFirst}
        aria-label="Toggle pinned view"
      >
        <Pin className={cn("size-4", favoritesFirst && "fill-amber-500")} />
      </Button>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="size-5 text-muted-foreground" />
        </Button>
        <SheetContent side="right" className="w-full overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription className="sr-only">
              Configure clipboard monitoring and sync.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-1 px-6 pb-6">
            {/* ── Monitoring row ── */}
            <SettingRow
              label="Monitoring"
              description={isMonitoring ? "Active" : "Paused"}
            >
              <button
                onClick={onToggleMonitoring}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
                  isMonitoring
                    ? "bg-foreground"
                    : "bg-input border-border",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none block size-3.5 rounded-full shadow-sm transition-transform",
                    isMonitoring
                      ? "translate-x-4 bg-background"
                      : "translate-x-0.5 bg-muted-foreground",
                  )}
                />
              </button>
            </SettingRow>

            <div className="h-px bg-border/60 my-1" />

            {/* ── History limit row ── */}
            <div className="py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-foreground">
                  History limit
                </span>
              </div>
              <ToggleGroup
                variant="outline"
                size="sm"
                value={[String(historyLimit)]}
                onValueChange={(value) => {
                  if (value.length > 0)
                    onHistoryLimitChange(Number(value[value.length - 1]));
                }}
                className="w-full"
              >
                {HISTORY_LIMIT_OPTIONS.map((option) => (
                  <ToggleGroupItem
                    key={option}
                    value={String(option)}
                    className="flex-1 text-xs"
                  >
                    {option}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="h-px bg-border/60 my-1" />

            {/* ── Sync section ── */}
            <SyncSection />

            {/* ── Danger zone ── */}
            {hasHistory && (
              <>
                <div className="h-px bg-border/60 my-1" />
                <div className="py-2">
                  <button
                    onClick={() => {
                      onClearAll();
                      setSettingsOpen(false);
                    }}
                    className="flex items-center gap-2 text-[13px] text-destructive/80 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                    Clear all history
                  </button>
                </div>
              </>
            )}

            {/* ── System info ── */}
            {systemInfo.isWayland && (
              <>
                <div className="h-px bg-border/60 my-1" />
                <div className="py-2">
                  <Badge variant="outline" className="text-xs">
                    Wayland
                    {systemInfo.isCosmicDataControlEnabled &&
                      " • Data Control"}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};

// ── Reusable row ──

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex flex-col">
        <span className="text-[13px] font-medium text-foreground">
          {label}
        </span>
        {description && (
          <span className="text-[11px] text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Sync section ──

type NetworkInterface = {
  name: string;
  ip: string;
};

function SyncSection() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    mode: "off",
    address: null,
    pairingCode: null,
    connectedPeers: 0,
  });
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedIface, setSelectedIface] = useState(0);
  const [hostname, setHostname] = useState("this device");
  const [connectAddress, setConnectAddress] = useState("");
  const [connectCode, setConnectCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await invoke<SyncStatus>("sync_status");
      setSyncStatus(status);
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

  const handleStartServer = async () => {
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

  const handleConnect = async () => {
    if (!connectAddress.trim() || !connectCode.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await invoke("sync_connect", {
        address: connectAddress.trim(),
        pairingCode: connectCode.trim(),
      });
      await refreshStatus();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    await invoke("sync_stop");
    await refreshStatus();
    setError(null);
  };

  const serverPort = syncStatus.address?.split(":").pop() ?? String(DEFAULT_SYNC_PORT);
  const currentIface = interfaces[selectedIface];
  const serverAddress =
    syncStatus.mode === "server" && currentIface
      ? `${currentIface.ip}:${serverPort}`
      : null;

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-foreground">
          Clipboard Sync
        </span>
        {syncStatus.mode !== "off" && (
          <button
            onClick={handleStop}
            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* ── Active: hosting ── */}
      {syncStatus.mode === "server" && (
        <div className="rounded-xl border border-border bg-accent/30 overflow-hidden">
          {/* Status header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-foreground">
              Sharing from {hostname}
            </span>
            {syncStatus.connectedPeers > 0 && (
              <span className="ml-auto text-[11px] text-muted-foreground">
                {syncStatus.connectedPeers} peer
                {syncStatus.connectedPeers !== 1 && "s"}
              </span>
            )}
          </div>

          {/* QR + address */}
          {serverAddress && (
            <div className="flex flex-col items-center gap-3 p-4">
              <div className="rounded-lg bg-white p-2.5">
                <QRCodeSVG
                  value={serverAddress}
                  size={100}
                  bgColor="#ffffff"
                  fgColor="#18181b"
                  level="M"
                />
              </div>
              <button
                onClick={() => handleCopyAddress(serverAddress)}
                className="group flex items-center gap-1.5 rounded-md bg-background/80 border border-border px-2.5 py-1 transition-colors hover:bg-accent"
              >
                <code className="text-xs text-foreground select-all">
                  {serverAddress}
                </code>
                <Copy className="size-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
              {/* Pairing code */}
              {syncStatus.pairingCode && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    Code:
                  </span>
                  <span className="font-mono text-base font-semibold tracking-[0.25em] text-foreground">
                    {syncStatus.pairingCode}
                  </span>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                {copied
                  ? "Copied!"
                  : "Share the address and pairing code with the other device."}
              </p>
            </div>
          )}

          {/* Interface list */}
          {interfaces.length > 1 && (
            <div className="border-t border-border/60 px-3 py-2">
              <span className="text-[11px] text-muted-foreground block mb-1.5">
                Network interfaces
              </span>
              <div className="flex flex-col gap-0.5">
                {interfaces.map((iface, idx) => (
                  <button
                    key={`${iface.name}-${iface.ip}`}
                    onClick={() => setSelectedIface(idx)}
                    className={cn(
                      "flex items-center justify-between rounded-md px-2 py-1 text-xs transition-colors",
                      idx === selectedIface
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <span className="font-medium">{iface.name}</span>
                    <code>{iface.ip}</code>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Active: connected as client ── */}
      {syncStatus.mode === "client" && (
        <div className="rounded-xl border border-border bg-accent/30 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-foreground">
              Connected to {syncStatus.address}
            </span>
          </div>
        </div>
      )}

      {/* ── Disconnected: show actions ── */}
      {syncStatus.mode === "off" && (
        <div className="flex flex-col gap-3">
          {/* Start sharing — primary action */}
          <button
            onClick={handleStartServer}
            disabled={loading}
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-border p-3 transition-all",
              "hover:border-foreground/20 hover:bg-accent/50",
              "disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
              <CirclePlay className="size-4" />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-[13px] font-medium text-foreground">
                Start sharing
              </span>
              <span className="text-[11px] text-muted-foreground">
                Share from {hostname}
              </span>
            </div>
            <ArrowRight className="ml-auto size-4 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
          </button>

          {/* Join — secondary action */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted-foreground pl-0.5">
              Or join another device
            </span>
            <div className="flex flex-col gap-1.5">
              <Input
                placeholder="192.168.1.x:9876"
                value={connectAddress}
                onChange={(e) => setConnectAddress(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Pairing code"
                  value={connectCode}
                  onChange={(e) => setConnectCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  className="flex-1 h-8 text-xs font-mono tracking-widest"
                  maxLength={6}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnect}
                  disabled={
                    loading ||
                    !connectAddress.trim() ||
                    !connectCode.trim()
                  }
                  className="h-8 px-3"
                >
                  Join
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-[11px] text-destructive leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
}
