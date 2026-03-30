import { useRef } from "react";
import {
  CirclePause,
  CirclePlay,
  EllipsisVertical,
  Pin,
  Search,
  Trash2,
} from "lucide-react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { SystemInfo } from "@/types/clipboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const HISTORY_LIMIT_OPTIONS = [25, 50, 100, 200, 500] as const;

type ClipboardHeaderProps = {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  hasHistory: boolean;
  onClearAll: () => void;
  systemInfo: SystemInfo;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  historyLimit: number;
  onHistoryLimitChange: (limit: number) => void;
  favoritesFirst: boolean;
  onToggleFavoritesFirst: () => void;
};

export const ClipboardHeader = ({
  isMonitoring,
  onToggleMonitoring,
  hasHistory,
  onClearAll,
  systemInfo,
  searchQuery,
  onSearchChange,
  historyLimit,
  onHistoryLimitChange,
  favoritesFirst,
  onToggleFavoritesFirst,
}: ClipboardHeaderProps) => {
  const searchRef = useRef<HTMLInputElement>(null);

  useHotkey(
    "Mod+K",
    () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    },
    { ignoreInputs: false },
  );

  useHotkey(
    "I",
    () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    },
    { ignoreInputs: false },
  );

  return (
    <header className="flex items-center gap-2 px-4 pb-2 pt-1 group/header">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={searchRef}
          type="search"
          placeholder="Search clipboard…"
          aria-label="Search clipboard history"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8"
        />
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(
          "shrink-0 text-neutral-400 dark:text-neutral-600",
          favoritesFirst && "text-amber-500",
        )}
        onClick={onToggleFavoritesFirst}
        aria-label="Toggle pinned view"
      >
        <Pin className={cn("size-4", favoritesFirst && "fill-amber-500")} />
      </Button>

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
                  {systemInfo.isCosmicDataControlEnabled && " • Data Control ✓"}
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

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              History limit ({historyLimit})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  Max items to fetch from db
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={historyLimit}
                  onValueChange={(value) =>
                    onHistoryLimitChange(value as number)
                  }
                >
                  {HISTORY_LIMIT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {hasHistory && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onClearAll}>
                <Trash2 className="size-4" />
                Clear all history
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
