import type { Hotkey } from "@tanstack/react-hotkeys";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type {
  HotkeyAction,
  HotkeyConfig,
} from "@/features/hotkey/hotkey-actions";
import { GeneralSettings } from "@/features/preferences/components/general-settings";
import { HotkeysSettings } from "@/features/preferences/components/hotkeys-settings";
import { SyncSettings } from "../sync/sync-settings";
import { useSync } from "../../sync/hooks/use-sync";
import { Cloud, Keyboard, Settings2, Wifi } from "lucide-react";
import { SyncCloudConnect } from "@/features/preferences/sync/sync-cloud-connect";

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

  return (
    <Tabs defaultValue="general" className="px-6 pb-6">
      <TabsList className="w-full mb-3">
        <TabsTrigger value="general" className="flex-1 text-xs">
          <Settings2 />
        </TabsTrigger>

        <TabsTrigger value="sync" className="flex-1 text-xs gap-1.5">
          <Wifi />
        </TabsTrigger>

        <TabsTrigger value="cloud" className="flex-1 text-xs gap-1.5">
          <Cloud />
        </TabsTrigger>

        <TabsTrigger value="keymap" className="flex-1 text-xs">
          <Keyboard />
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

      <TabsContent value="cloud">
        <SyncCloudConnect />
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
