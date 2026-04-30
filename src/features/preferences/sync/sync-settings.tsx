import { useState } from "react";
import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useSync } from "../../sync/hooks/use-sync";
import { useDiscoveredDevices } from "./use-discovered-devices";
import { SyncStatusIndicator } from "./sync-status-indicator";
import { SyncLanServerCard } from "./sync-lan-server-card";
import { SyncLanConnect } from "./sync-lan-connect";

type SyncSettingsProps = {
  sync: ReturnType<typeof useSync>;
};

export function SyncSettings({ sync }: SyncSettingsProps) {
  const [tab] = useState<"lan" | "cloud">("lan");
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

      {!isActive && (
        <SyncLanConnect
          hostname={sync.hostname}
          loading={sync.loading}
          discoveredDevices={discoveredDevices}
          onStartServer={sync.startServer}
          onConnect={sync.connectLan}
        />
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
