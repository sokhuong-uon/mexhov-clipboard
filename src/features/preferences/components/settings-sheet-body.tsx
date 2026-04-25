import type { Hotkey } from "@tanstack/react-hotkeys";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { HotkeyAction, HotkeyConfig } from "@/hooks/use-hotkeys-config";
import { GeneralSettings } from "@/features/preferences/components/general-settings";
import { HotkeysSettings } from "@/features/preferences/components/hotkeys-settings";
import { SyncSettings } from "../sync/sync-settings";
import { useSync } from "../sync/use-sync";

type SettingsBodyProps = {
  historyLimit: number;
  onHistoryLimitChange: (limit: number) => void;
  hotkeys: HotkeyConfig;
  onSetHotkey: (action: HotkeyAction, hotkey: Hotkey) => void;
  onResetHotkey: (action: HotkeyAction) => void;
  onResetAllHotkeys: () => void;
};

export function SettingsSheetBody({
  historyLimit,
  onHistoryLimitChange,
  hotkeys,
  onSetHotkey,
  onResetHotkey,
  onResetAllHotkeys,
}: SettingsBodyProps) {
  const sync = useSync();
  const isSyncActive = sync.status.mode !== "off";
  const isCloudSync = sync.status.mode === "cloud";

  return (
    <Tabs defaultValue="general" className="px-6 pb-6">
      <TabsList className="w-full mb-3">
        <TabsTrigger value="general" className="flex-1 text-xs">
          General
        </TabsTrigger>

        <TabsTrigger value="sync" className="flex-1 text-xs gap-1.5">
          Sync
          {isSyncActive && (
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                isCloudSync ? "bg-sky-500" : "bg-emerald-500",
              )}
            />
          )}
        </TabsTrigger>

        <TabsTrigger value="keymap" className="flex-1 text-xs">
          Keymap
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <GeneralSettings
          historyLimit={historyLimit}
          onHistoryLimitChange={onHistoryLimitChange}
        />
      </TabsContent>

      <TabsContent value="sync">
        <SyncSettings sync={sync} />
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
  );
}
