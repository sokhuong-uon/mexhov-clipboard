import { CirclePause, CirclePlay, Trash2 } from "lucide-react";
import { SystemInfo } from "@/types/clipboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type ClipboardHeaderProps = {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  hasHistory: boolean;
  onClearAll: () => void;
  systemInfo: SystemInfo;
};

export const ClipboardHeader = ({
  isMonitoring,
  onToggleMonitoring,
  hasHistory,
  onClearAll,
  systemInfo,
}: ClipboardHeaderProps) => {
  return (
    <header className="flex justify-between items-center p-4">
      <div className="flex items-center gap-2 w-full">
        {systemInfo.isWayland && (
          <Badge variant="outline">
            Wayland
            {systemInfo.isCosmicDataControlEnabled && " • Data Control ✓"}
          </Badge>
        )}

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleMonitoring}
                className="ml-auto"
              />
            }
          >
            {isMonitoring ? (
              <CirclePlay className="size-5 text-muted-foreground" />
            ) : (
              <CirclePause className="size-5 text-muted-foreground" />
            )}
          </TooltipTrigger>
          <TooltipContent>
            {isMonitoring ? "Monitoring active" : "Monitoring paused"}
          </TooltipContent>
        </Tooltip>

        {hasHistory && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-sm" onClick={onClearAll} />
              }
            >
              <Trash2 className="size-5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Clear all history</TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
  );
};
