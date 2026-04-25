import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { SystemInfo } from "@/types/clipboard";
import { PAGE_LIMIT_OPTIONS } from "@/hooks/use-settings";
import { SettingRow } from "./setting-row";
import { SyncSettings } from "./sync/sync-settings";

type GeneralSettingsProps = {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  hasHistory: boolean;
  onClearAll: () => void;
  systemInfo: SystemInfo;
  historyLimit: number;
  onHistoryLimitChange: (limit: number) => void;
};

export function GeneralSettings({
  isMonitoring,
  onToggleMonitoring,
  hasHistory,
  onClearAll,
  systemInfo,
  historyLimit,
  onHistoryLimitChange,
}: GeneralSettingsProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* ── Monitoring row ── */}
      <SettingRow
        label="Monitoring"
        description={isMonitoring ? "Active" : "Paused"}
      >
        <button
          onClick={onToggleMonitoring}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
            isMonitoring ? "bg-foreground" : "bg-input border-border",
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

      {/* ── Page limit row ── */}
      <div className="py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-foreground">
            Page limit
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
          {PAGE_LIMIT_OPTIONS.map((option) => (
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
      <SyncSettings />

      {/* ── Danger zone ── */}
      {hasHistory && (
        <>
          <div className="h-px bg-border/60 my-1" />
          <div className="py-2">
            <button
              onClick={onClearAll}
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
              {systemInfo.isCosmicDataControlEnabled && " • Data Control"}
            </Badge>
          </div>
        </>
      )}
    </div>
  );
}
