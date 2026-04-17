import { useState, useEffect, useRef } from "react";
import { commands } from "@/bindings";
import { listen } from "@tauri-apps/api/event";
import { SystemInfo, ClipboardContent } from "@/types/clipboard";

type ClipboardChangeEvent =
  | { type: "text"; text: string }
  | { type: "image"; base64Data: string; width: number; height: number };

type MonitorOptions = {
  onClipboardChange: (content: ClipboardContent) => void;
  onCurrentContentUpdate: (content: ClipboardContent) => void;
  isMonitoring: boolean;
};

export const useClipboardMonitor = ({
  onClipboardChange,
  onCurrentContentUpdate,
  isMonitoring,
}: MonitorOptions) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    isWayland: false,
    isCosmicDataControlEnabled: false,
  });
  const previousContentRef = useRef<ClipboardContent | null>(null);

  // Detect system capabilities
  useEffect(() => {
    Promise.all([
      commands.isWaylandSession(),
      commands.isCosmicDataControlEnabled(),
    ])
      .then(([isWayland, isCosmicDataControlEnabled]) => {
        setSystemInfo({ isWayland, isCosmicDataControlEnabled });
      })
      .catch(() => {
        setSystemInfo({ isWayland: false, isCosmicDataControlEnabled: false });
      });
  }, []);

  // Tell backend whether to monitor
  useEffect(() => {
    commands.setMonitoring(isMonitoring).catch(console.error);
  }, [isMonitoring]);

  // Stable refs for callbacks to avoid re-subscribing on every render
  const onChangeRef = useRef(onClipboardChange);
  const onUpdateRef = useRef(onCurrentContentUpdate);
  useEffect(() => {
    onChangeRef.current = onClipboardChange;
  }, [onClipboardChange]);
  useEffect(() => {
    onUpdateRef.current = onCurrentContentUpdate;
  }, [onCurrentContentUpdate]);

  // Listen for clipboard-changed events from backend
  useEffect(() => {
    const unlisten = listen<ClipboardChangeEvent>(
      "clipboard-changed",
      (event) => {
        const payload = event.payload;
        let content: ClipboardContent;

        if (payload.type === "text") {
          content = { type: "text", text: payload.text };
        } else {
          content = {
            type: "image",
            base64Data: payload.base64Data,
            width: payload.width,
            height: payload.height,
          };
        }

        previousContentRef.current = content;
        onUpdateRef.current(content);
        onChangeRef.current(content);
      },
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return {
    systemInfo,
    previousContentRef,
  };
};
