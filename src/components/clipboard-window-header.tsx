import { CirclePause, CirclePlay, EllipsisVertical, Search, Trash2 } from "lucide-react";
import { SystemInfo } from "@/types/clipboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ClipboardHeaderProps = {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  hasHistory: boolean;
  onClearAll: () => void;
  systemInfo: SystemInfo;
  searchQuery: string;
  onSearchChange: (query: string) => void;
};

export const ClipboardHeader = ({
  isMonitoring,
  onToggleMonitoring,
  hasHistory,
  onClearAll,
  systemInfo,
  searchQuery,
  onSearchChange,
}: ClipboardHeaderProps) => {
  return (
    <header className="flex items-center gap-2 p-4">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search clipboard…"
          aria-label="Search clipboard history"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" className="shrink-0" />
          }
        >
          <EllipsisVertical className="size-5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {systemInfo.isWayland && (
            <>
              <div className="px-3 py-2">
                <Badge variant="outline">
                  Wayland
                  {systemInfo.isCosmicDataControlEnabled &&
                    " • Data Control ✓"}
                </Badge>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onToggleMonitoring}>
            {isMonitoring ? (
              <>
                <CirclePause className="size-4" />
                Pause monitoring
              </>
            ) : (
              <>
                <CirclePlay className="size-4" />
                Resume monitoring
              </>
            )}
          </DropdownMenuItem>
          {hasHistory && (
            <DropdownMenuItem
              variant="destructive"
              onClick={onClearAll}
            >
              <Trash2 className="size-4" />
              Clear all history
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
