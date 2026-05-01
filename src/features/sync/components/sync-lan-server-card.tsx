import { useEffect, useState } from "react";
import { Copy, Wifi } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import type { SyncStatus, NetworkInterface } from "../hooks/use-sync";
import { SyncStatusIndicator } from "./sync-status-indicator";

type SyncLanServerCardProps = {
  status: SyncStatus;
  hostname: string;
  interfaces: NetworkInterface[];
  serverPort: string;
};

export function SyncLanServerCard({
  status,
  hostname,
  interfaces,
  serverPort,
}: SyncLanServerCardProps) {
  const [selectedIface, setSelectedIface] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentIface = interfaces[selectedIface];
  const serverAddress = currentIface
    ? `${currentIface.ip}:${serverPort}`
    : null;

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
  };

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="rounded-xl border border-border bg-accent/30 overflow-hidden">
      <div className="border-b border-border/60">
        <SyncStatusIndicator
          icon={Wifi}
          label={`Sharing from ${hostname}`}
          peerCount={status.connectedPeers}
        />
      </div>

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
            onClick={() => handleCopy(serverAddress)}
            className="group flex items-center gap-1.5 rounded-md bg-background/80 border border-border px-2.5 py-1 transition-colors hover:bg-accent"
          >
            <code className="text-xs text-foreground select-all">
              {serverAddress}
            </code>
            <Copy className="size-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            {copied
              ? "Copied!"
              : "When another device requests to connect, you'll be asked to confirm here."}
          </p>
        </div>
      )}

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
  );
}
