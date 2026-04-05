import { useRef } from "react";
import { Search } from "lucide-react";
import { useHotkey } from "@tanstack/react-hotkeys";
import type { Hotkey } from "@tanstack/react-hotkeys";
import { SystemInfo, ClipboardFilters } from "@/types/clipboard";
import { Input } from "@/components/ui/input";
import type { HotkeyAction, HotkeyConfig } from "@/hooks/use-hotkeys-config";
import { SettingsSheet } from "@/features/preferences/settings-sheet";
import { ClipboardFilterMenu } from "@/components/clipboard-filter-menu";

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
  filters: ClipboardFilters;
  onFiltersChange: (filters: ClipboardFilters) => void;
  hotkeys: HotkeyConfig;
  onSetHotkey: (action: HotkeyAction, hotkey: Hotkey) => void;
  onResetHotkey: (action: HotkeyAction) => void;
  onResetAllHotkeys: () => void;
  isEditingNote?: boolean;
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
  filters,
  onFiltersChange,
  hotkeys,
  onSetHotkey,
  onResetHotkey,
  onResetAllHotkeys,
  isEditingNote = false,
}: ClipboardHeaderProps) => {
  const searchRef = useRef<HTMLInputElement>(null);

  const focusSearch = () => {
    searchRef.current?.focus();
    searchRef.current?.select();
  };

  useHotkey(hotkeys.search, focusSearch, {
    enabled: !isEditingNote,
    ignoreInputs: false,
  });
  useHotkey(hotkeys.searchAlt, focusSearch, {
    enabled: !isEditingNote,
    ignoreInputs: false,
  });

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

      <ClipboardFilterMenu
        filters={filters}
        onFiltersChange={onFiltersChange}
      />

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
