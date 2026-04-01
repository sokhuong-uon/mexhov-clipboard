import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SyncStatusIndicatorProps = {
  icon: LucideIcon;
  label: string;
  color?: "emerald" | "sky";
  peerCount?: number;
};

export function SyncStatusIndicator({
  icon: Icon,
  label,
  color = "emerald",
  peerCount,
}: SyncStatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <span className="relative flex size-2">
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-75",
            color === "emerald" ? "bg-emerald-400" : "bg-sky-400",
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            color === "emerald" ? "bg-emerald-500" : "bg-sky-500",
          )}
        />
      </span>
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-xs font-medium text-foreground">{label}</span>
      {peerCount != null && peerCount > 0 && (
        <span className="ml-auto text-[11px] text-muted-foreground">
          {peerCount} peer{peerCount !== 1 && "s"}
        </span>
      )}
    </div>
  );
}
