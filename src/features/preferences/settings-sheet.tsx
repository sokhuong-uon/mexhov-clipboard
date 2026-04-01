import { useState } from "react";
import { Settings2 } from "lucide-react";
import type { Hotkey } from "@tanstack/react-hotkeys";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { SystemInfo } from "@/types/clipboard";
import type { HotkeyAction, HotkeyConfig } from "@/hooks/use-hotkeys-config";
import { GeneralSettings } from "./general-settings";
import { HotkeysSettings } from "./hotkeys-settings";

type SettingsSheetProps = {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  hasHistory: boolean;
  onClearAll: () => void;
  systemInfo: SystemInfo;
  historyLimit: number;
  onHistoryLimitChange: (limit: number) => void;
  hotkeys: HotkeyConfig;
  onSetHotkey: (action: HotkeyAction, hotkey: Hotkey) => void;
  onResetHotkey: (action: HotkeyAction) => void;
  onResetAllHotkeys: () => void;
};

export function SettingsSheet({
  isMonitoring,
  onToggleMonitoring,
  hasHistory,
  onClearAll,
  systemInfo,
  historyLimit,
  onHistoryLimitChange,
  hotkeys,
  onSetHotkey,
  onResetHotkey,
  onResetAllHotkeys,
}: SettingsSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        <Settings2 className="size-5 text-muted-foreground" />
      </Button>
      <SheetContent side="right" className="w-full overflow-y-auto">
        <SheetHeader className="pb-0">
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription className="sr-only">
            Configure clipboard monitoring, sync, and keyboard shortcuts.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="general" className="px-6 pb-6">
          <TabsList className="w-full mb-3">
            <TabsTrigger value="general" className="flex-1 text-xs">
              General
            </TabsTrigger>
            <TabsTrigger value="keymap" className="flex-1 text-xs">
              Keymap
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettings
              isMonitoring={isMonitoring}
              onToggleMonitoring={onToggleMonitoring}
              hasHistory={hasHistory}
              onClearAll={() => {
                onClearAll();
                setOpen(false);
              }}
              systemInfo={systemInfo}
              historyLimit={historyLimit}
              onHistoryLimitChange={onHistoryLimitChange}
            />
          </TabsContent>

          <TabsContent value="keymap">
            <HotkeysSettings
              hotkeys={hotkeys}
              onSetHotkey={onSetHotkey}
              onResetHotkey={onResetHotkey}
              onResetAll={onResetAllHotkeys}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
