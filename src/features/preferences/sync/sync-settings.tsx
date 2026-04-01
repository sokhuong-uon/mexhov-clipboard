import { useState } from "react";
import { Cloud, Globe, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSync } from "./use-sync";
import { SyncStatusIndicator } from "./sync-status-indicator";
import { SyncLanServerCard } from "./sync-lan-server-card";
import { SyncLanConnect } from "./sync-lan-connect";
import { SyncCloudConnect } from "./sync-cloud-connect";

export function SyncSettings() {
  const sync = useSync();
  const [tab, setTab] = useState<"lan" | "cloud">("lan");

  const isActive = sync.status.mode !== "off";

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-foreground">
          Clipboard Sync
        </span>
        {isActive && (
          <button
            onClick={sync.disconnect}
            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* ── Active states ── */}
      {sync.status.mode === "lan-server" && (
        <SyncLanServerCard
          status={sync.status}
          hostname={sync.hostname}
          interfaces={sync.interfaces}
          serverPort={sync.serverPort}
        />
      )}

      {sync.status.mode === "lan-client" && (
        <div className="rounded-xl border border-border bg-accent/30 overflow-hidden">
          <SyncStatusIndicator
            icon={Wifi}
            label={`Connected to ${sync.status.address}`}
          />
        </div>
      )}

      {sync.status.mode === "cloud" && (
        <div className="rounded-xl border border-border bg-accent/30 overflow-hidden">
          <SyncStatusIndicator
            icon={Cloud}
            label="Cloud sync active"
            color="sky"
            peerCount={sync.status.connectedPeers}
          />
          {sync.status.roomId && (
            <div className="border-t border-border/60 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">
                  Room:
                </span>
                <code className="text-[11px] text-foreground">
                  {sync.status.roomId}
                </code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Disconnected: pick LAN or Cloud ── */}
      {!isActive && (
        <div className="flex flex-col gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => {
                setTab("lan");
                sync.clearError();
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors",
                tab === "lan"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              <Wifi className="size-3.5" />
              LAN
            </button>
            <button
              onClick={() => {
                setTab("cloud");
                sync.clearError();
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors border-l border-border",
                tab === "cloud"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              <Globe className="size-3.5" />
              Cloud
            </button>
          </div>

          {tab === "lan" && (
            <SyncLanConnect
              hostname={sync.hostname}
              loading={sync.loading}
              onStartServer={sync.startServer}
              onConnect={sync.connectLan}
            />
          )}

          {tab === "cloud" && (
            <SyncCloudConnect
              loading={sync.loading}
              onConnect={sync.connectCloud}
            />
          )}
        </div>
      )}

      {sync.error && (
        <p className="mt-2 text-[11px] text-destructive leading-relaxed">
          {sync.error}
        </p>
      )}
    </div>
  );
}
