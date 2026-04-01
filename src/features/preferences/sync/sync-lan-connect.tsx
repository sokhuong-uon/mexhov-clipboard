import { useState } from "react";
import { CirclePlay, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SyncLanConnectProps = {
  hostname: string;
  loading: boolean;
  onStartServer: () => void;
  onConnect: (address: string, pairingCode: string) => void;
};

export function SyncLanConnect({
  hostname,
  loading,
  onStartServer,
  onConnect,
}: SyncLanConnectProps) {
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");

  const handleConnect = () => {
    if (address.trim() && code.trim()) {
      onConnect(address.trim(), code.trim());
    }
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

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted-foreground pl-0.5">
          Or join another device
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
