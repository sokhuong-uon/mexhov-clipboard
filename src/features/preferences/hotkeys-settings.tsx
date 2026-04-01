import { useState } from "react";
import type { Hotkey } from "@tanstack/react-hotkeys";

import {
  HOTKEY_ACTIONS,
  type HotkeyAction,
  type HotkeyConfig,
} from "@/hooks/use-hotkeys-config";
import { HotkeyRow } from "@/features/preferences/hotkey-row";

type HotkeysSettingsProps = {
  hotkeys: HotkeyConfig;
  onSetHotkey: (action: HotkeyAction, hotkey: Hotkey) => void;
  onResetHotkey: (action: HotkeyAction) => void;
  onResetAll: () => void;
};

export function HotkeysSettings({
  hotkeys,
  onSetHotkey,
  onResetHotkey,
  onResetAll,
}: HotkeysSettingsProps) {
  const [recordingAction, setRecordingAction] = useState<HotkeyAction | null>(
    null,
  );

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium text-foreground">
          Keyboard shortcuts
        </span>
        <button
          onClick={onResetAll}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset all
        </button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/60">
        {HOTKEY_ACTIONS.map((action) => (
          <HotkeyRow
            key={action}
            action={action}
            hotkey={hotkeys[action]}
            isRecording={recordingAction === action}
            onStartRecording={() => setRecordingAction(action)}
            onStopRecording={() => setRecordingAction(null)}
            onSetHotkey={onSetHotkey}
            onResetHotkey={onResetHotkey}
          />
        ))}
      </div>
    </div>
  );
}
