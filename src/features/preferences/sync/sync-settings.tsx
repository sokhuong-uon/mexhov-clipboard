import { useState } from "react";
import { Cloud, Globe, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { useSync } from "./use-sync";
import { useDiscoveredDevices } from "./use-discovered-devices";
import { SyncStatusIndicator } from "./sync-status-indicator";
import { SyncLanServerCard } from "./sync-lan-server-card";
import { SyncLanConnect } from "./sync-lan-connect";
import { SyncCloudConnect } from "./sync-cloud-connect";

type SyncSettingsProps = {
  sync: ReturnType<typeof useSync>;
};

export function SyncSettings({ sync }: SyncSettingsProps) {
  const [tab, setTab] = useState<"lan" | "cloud">("lan");
  const discoveredDevices = useDiscoveredDevices(
    tab === "lan" && sync.status.mode === "off",
  );

  const isActive = sync.status.mode !== "off";

  return (
    <div className="flex flex-col gap-3">
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
                <span className="text-[11px] text-muted-foreground">Room:</span>
                <code className="text-[11px] text-foreground">
                  {sync.status.roomId}
                </code>
              </div>
            </div>
          )}
        </div>
      )}

      {!isActive && (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground pl-0.5">
              Mirror your clipboard between devices
            </span>
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
          </div>

          {tab === "lan" && (
            <SyncLanConnect
              hostname={sync.hostname}
              loading={sync.loading}
              discoveredDevices={discoveredDevices}
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
        </>
      )}

      {sync.error && (
        <p className="text-[11px] text-destructive leading-relaxed">
          {sync.error}
        </p>
      )}

      {isActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={sync.disconnect}
          className="w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10"
        >
          Disconnect
        </Button>
      )}
    </div>
  );
}
