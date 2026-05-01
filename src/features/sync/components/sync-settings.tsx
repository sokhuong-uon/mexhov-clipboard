import { useState } from "react";
import { Wifi, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { useSync } from "@/features/sync/hooks/use-sync";
import { useDiscoveredDevices } from "@/features/sync/hooks/use-discovered-devices";
import { SyncStatusIndicator } from "@/features/sync/components/sync-status-indicator";
import { SyncLanServerCard } from "@/features/sync/components/sync-lan-server-card";
import { SyncLanConnect } from "@/features/sync/components/sync-lan-connect";

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

      <Dialog
        open={sync.pending !== null}
        onOpenChange={(open) => {
          if (!open) sync.rejectPending();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allow this device to connect?</DialogTitle>
            <DialogDescription>
              Only approve devices you recognize. Clipboard contents are synced
              end-to-end encrypted once approved.
            </DialogDescription>
          </DialogHeader>

          {sync.pending && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-accent/30 p-3">
              <Monitor className="size-5 text-muted-foreground shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {sync.pending.hostname}
                </span>
                <code className="text-[11px] text-muted-foreground truncate">
                  {sync.pending.address}
                </code>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={sync.rejectPending}>
              Reject
            </Button>
            <Button size="sm" onClick={sync.approvePending}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
