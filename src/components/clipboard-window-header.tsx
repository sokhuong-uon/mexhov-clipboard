import { useRef } from "react";
import { Pin, Search } from "lucide-react";
import { useHotkey } from "@tanstack/react-hotkeys";
import type { Hotkey } from "@tanstack/react-hotkeys";
import { SystemInfo } from "@/types/clipboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HotkeyAction, HotkeyConfig } from "@/hooks/use-hotkeys-config";
import { SettingsSheet } from "@/features/preferences/settings-sheet";

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
  hotkeys: HotkeyConfig;
  onSetHotkey: (action: HotkeyAction, hotkey: Hotkey) => void;
  onResetHotkey: (action: HotkeyAction) => void;
  onResetAllHotkeys: () => void;
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
  hotkeys,
  onSetHotkey,
  onResetHotkey,
  onResetAllHotkeys,
}: ClipboardHeaderProps) => {
  const searchRef = useRef<HTMLInputElement>(null);

  const focusSearch = () => {
    searchRef.current?.focus();
    searchRef.current?.select();
  };

  useHotkey(hotkeys.search, focusSearch, { ignoreInputs: false });
  useHotkey(hotkeys.searchAlt, focusSearch, { ignoreInputs: false });

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

      <SettingsSheet
        isMonitoring={isMonitoring}
        onToggleMonitoring={onToggleMonitoring}
        hasHistory={hasHistory}
        onClearAll={onClearAll}
        systemInfo={systemInfo}
        historyLimit={historyLimit}
        onHistoryLimitChange={onHistoryLimitChange}
        hotkeys={hotkeys}
        onSetHotkey={onSetHotkey}
        onResetHotkey={onResetHotkey}
        onResetAllHotkeys={onResetAllHotkeys}
      />
    </header>
  );
};
