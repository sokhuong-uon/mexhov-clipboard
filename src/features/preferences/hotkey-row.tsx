import { RotateCcw } from "lucide-react";
import { useHotkeyRecorder, formatForDisplay } from "@tanstack/react-hotkeys";
import type { Hotkey } from "@tanstack/react-hotkeys";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HOTKEY_META, type HotkeyAction } from "@/hooks/use-hotkeys-config";

export function HotkeyRow({
  action,
  hotkey,
  isRecording,
  onStartRecording,
  onStopRecording,
  onSetHotkey,
  onResetHotkey,
}: {
  action: HotkeyAction;
  hotkey: Hotkey;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSetHotkey: (action: HotkeyAction, hotkey: Hotkey) => void;
  onResetHotkey: (action: HotkeyAction) => void;
}) {
  const { label, defaultKey } = HOTKEY_META[action];
  const isCustom = hotkey !== defaultKey;

  const recorder = useHotkeyRecorder({
    onRecord: (recorded: Hotkey) => {
      onSetHotkey(action, recorded);
      onStopRecording();
    },
    onCancel: onStopRecording,
  });

  const handleClick = () => {
    if (isRecording) {
      recorder.cancelRecording();
    } else {
      onStartRecording();
      recorder.startRecording();
    }
  };

  const displayText = isRecording
    ? recorder.recordedHotkey
      ? formatForDisplay(recorder.recordedHotkey)
      : "\u2026"
    : formatForDisplay(hotkey);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 group">
      <span className="text-[12px] text-muted-foreground">{label}</span>

      <div className="flex items-center gap-1">
        {isCustom && !isRecording && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onResetHotkey(action)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Reset ${label} to default`}
          >
            <RotateCcw className="size-3" />
          </Button>
        )}

        <Badge
          variant={isRecording ? "default" : "outline"}
          className={cn(
            "cursor-pointer select-none font-mono tabular-nums min-w-8 justify-center",
            isRecording && "animate-pulse",
          )}
          render={<button onClick={handleClick} />}
        >
          {displayText}
        </Badge>
      </div>
    </div>
  );
}
