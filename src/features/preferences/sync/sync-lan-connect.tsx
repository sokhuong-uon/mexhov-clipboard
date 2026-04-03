import { useRef, useState } from "react";
import { CirclePlay, ArrowRight, Monitor, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DiscoveredDevice } from "./use-discovered-devices";

type SyncLanConnectProps = {
  hostname: string;
  loading: boolean;
  discoveredDevices: DiscoveredDevice[];
  onStartServer: () => void;
  onConnect: (address: string, pairingCode: string) => void;
};

export function SyncLanConnect({
  hostname,
  loading,
  discoveredDevices,
  onStartServer,
  onConnect,
}: SyncLanConnectProps) {
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleConnect = () => {
    if (address.trim() && code.trim()) {
      onConnect(address.trim(), code.trim());
    }
  };

  const handleSelectDevice = (deviceAddress: string) => {
    setAddress(deviceAddress);
    setTimeout(() => codeInputRef.current?.focus(), 0);
  };

  return (
    <>
      <button
        onClick={onStartServer}
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

      {/* Discovered devices */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 pl-0.5">
          <span className="text-[11px] text-muted-foreground">
            Devices on your network
          </span>
          {discoveredDevices.length === 0 && (
            <Loader2 className="size-3 text-muted-foreground animate-spin" />
          )}
        </div>

        {discoveredDevices.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {discoveredDevices.map((device) => (
              <button
                key={device.address}
                onClick={() => handleSelectDevice(device.address)}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all",
                  address === device.address
                    ? "border-foreground/20 bg-accent"
                    : "border-border hover:border-foreground/20 hover:bg-accent/50",
                )}
              >
                <Monitor className="size-4 text-muted-foreground" />
                <div className="flex flex-col items-start text-left min-w-0">
                  <span className="text-[12px] font-medium text-foreground truncate w-full">
                    {device.hostname}
                  </span>
                  <code className="text-[10px] text-muted-foreground">
                    {device.address}
                  </code>
                </div>
                <ArrowRight className="ml-auto size-3.5 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 pl-0.5">
            Scanning for nearby devices…
          </p>
        )}
      </div>

      {/* Manual entry */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted-foreground pl-0.5">
          Or enter address manually
        </span>
        <div className="flex flex-col gap-1.5">
          <Input
            placeholder="192.168.1.x:9876"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Input
              ref={codeInputRef}
              placeholder="Pairing code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="flex-1 h-8 text-xs font-mono tracking-widest"
              maxLength={6}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnect}
              disabled={loading || !address.trim() || !code.trim()}
              className="h-8 px-3"
            >
              Join
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
