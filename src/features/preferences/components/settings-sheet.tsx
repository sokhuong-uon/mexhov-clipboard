import { Settings2 } from "lucide-react";
import type { Hotkey } from "@tanstack/react-hotkeys";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SystemInfo } from "@/types/clipboard";
import type { HotkeyAction, HotkeyConfig } from "@/hooks/use-hotkeys-config";
import { SettingsSheetBody } from "@/features/preferences/components/settings-sheet-body";

type SettingsSheetProps = {
  systemInfo: SystemInfo;
  historyLimit: number;
  onHistoryLimitChange: (limit: number) => void;
  hotkeys: HotkeyConfig;
  onSetHotkey: (action: HotkeyAction, hotkey: Hotkey) => void;
  onResetHotkey: (action: HotkeyAction) => void;
  onResetAllHotkeys: () => void;
};

export function SettingsSheet({
  systemInfo,
  historyLimit,
  onHistoryLimitChange,
  hotkeys,
  onSetHotkey,
  onResetHotkey,
  onResetAllHotkeys,
}: SettingsSheetProps) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-neutral-400 dark:text-neutral-600"
          />
        }
      >
        <Settings2 className="size-5" />
      </SheetTrigger>

      <SheetContent side="right" className="w-full overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription className="sr-only">
            Configure clipboard monitoring, sync, and keyboard shortcuts.
          </SheetDescription>
        </SheetHeader>

        <SettingsSheetBody
          systemInfo={systemInfo}
          historyLimit={historyLimit}
          onHistoryLimitChange={onHistoryLimitChange}
          hotkeys={hotkeys}
          onSetHotkey={onSetHotkey}
          onResetHotkey={onResetHotkey}
          onResetAllHotkeys={onResetAllHotkeys}
        />
      </SheetContent>
    </Sheet>
  );
}
