import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { SystemInfo, ClipboardContent } from "@/types/clipboard";

type MonitorOptions = {
  onClipboardChange: (content: ClipboardContent) => void;
  onCurrentContentUpdate: (content: ClipboardContent) => void;
  readContent: () => Promise<ClipboardContent>;
  isMonitoring: boolean;
};

// Helper to compare clipboard content for equality
const isContentEqual = (
  a: ClipboardContent | null,
  b: ClipboardContent | null,
): boolean => {
  if (a === null || b === null) return a === b;
  if (a.type !== b.type) return false;

  switch (a.type) {
    case "text":
      return b.type === "text" && a.text === b.text;
    case "image":
      return b.type === "image" && a.base64Data === b.base64Data;
    case "empty":
      return b.type === "empty";
    default:
      return false;
  }
};

// Helper to check if content is empty
const isContentEmpty = (content: ClipboardContent): boolean => {
  if (content.type === "empty") return true;
  if (content.type === "text" && !content.text.trim()) return true;
  if (content.type === "image" && !content.base64Data) return true;
  return false;
};

export const useClipboardMonitor = ({
  onClipboardChange,
  onCurrentContentUpdate,
  readContent,
  isMonitoring,
}: MonitorOptions) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    isWayland: false,
    isCosmicDataControlEnabled: false,
  });
  const [hasWindowFocus, setHasWindowFocus] = useState(false);
  const previousContentRef = useRef<ClipboardContent | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const isReadingRef = useRef<boolean>(false);

  // Detect system capabilities
  useEffect(() => {
    Promise.all([
      invoke<boolean>("is_wayland_session"),
      invoke<boolean>("is_cosmic_data_control_enabled"),
    ])
      .then(([isWayland, isCosmicDataControlEnabled]) => {
        setSystemInfo({ isWayland, isCosmicDataControlEnabled });

        if (isWayland && isCosmicDataControlEnabled) {
          console.log(
            "Wayland with data-control - background clipboard access available",
          );
        } else if (isWayland) {
          console.log("Wayland without data-control - requires window focus");
        }
      })
      .catch(() => {
        setSystemInfo({ isWayland: false, isCosmicDataControlEnabled: false });
      });
  }, []);

  // Read clipboard with retries (for focus events)
  const readClipboardOnFocus = useCallback(async () => {
    if (isReadingRef.current || !isMonitoring) return;

    isReadingRef.current = true;
    try {
      // Multiple attempts with delays (Wayland may need time)
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
        }

        const content = await readContent();

        if (!isContentEmpty(content)) {
          onCurrentContentUpdate(content);
          if (!isContentEqual(content, previousContentRef.current)) {
            previousContentRef.current = content;
            onClipboardChange(content);
          }
          break;
        }
      }
    } finally {
      isReadingRef.current = false;
    }
  }, [isMonitoring, readContent, onClipboardChange, onCurrentContentUpdate]);

  // Polling effect
  useEffect(() => {
    if (!isMonitoring) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // On Wayland without data-control, only poll when focused
    const { isWayland, isCosmicDataControlEnabled: hasDataControl } =
      systemInfo;
    if (isWayland && !hasDataControl && !hasWindowFocus) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Poll clipboard
    const interval = setInterval(
      async () => {
        if (isReadingRef.current) return;

        isReadingRef.current = true;
        try {
          const content = await readContent();

          if (!isContentEmpty(content)) {
            if (!isContentEqual(content, previousContentRef.current)) {
              previousContentRef.current = content;
              onCurrentContentUpdate(content);
              onClipboardChange(content);
            }
            // Skip onCurrentContentUpdate when unchanged — no state change needed
          }
        } finally {
          isReadingRef.current = false;
        }
      },
      isWayland ? 500 : 750,
    );

    pollingIntervalRef.current = interval;

    return () => {
      if (interval) clearInterval(interval);
      pollingIntervalRef.current = null;
    };
  }, [
    isMonitoring,
    systemInfo,
    hasWindowFocus,
    readContent,
    onClipboardChange,
    onCurrentContentUpdate,
  ]);

  // Initial clipboard read
  useEffect(() => {
    const initClipboard = async () => {
      const content = await readContent();
      if (!isContentEmpty(content)) {
        previousContentRef.current = content;
        onCurrentContentUpdate(content);
      }
    };
    initClipboard();
  }, [readContent, onCurrentContentUpdate]);

  // Window focus handling
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const { isWayland, isCosmicDataControlEnabled: hasDataControl } =
      systemInfo;

    const handleFocus = async () => {
      setHasWindowFocus(true);
      if (isWayland && !hasDataControl) {
        await readClipboardOnFocus();
      }
    };

    const handleBlur = () => {
      setHasWindowFocus(false);
    };

    // Tauri focus listener
    let unlistenFocus: (() => void) | null = null;
    const setupFocusListener = async () => {
      try {
        unlistenFocus = await appWindow.onFocusChanged((event) => {
          if (event.payload) {
            handleFocus();
          } else {
            handleBlur();
          }
        });
      } catch (error) {
        console.error("Failed to setup focus listener:", error);
      }
    };

    setupFocusListener();

    // Initialize focus state
    appWindow
      .isFocused()
      .then((focused) => {
        setHasWindowFocus(focused);
        if (focused && isWayland && !hasDataControl && isMonitoring) {
          readClipboardOnFocus();
        }
      })
      .catch(console.error);

    // Browser focus events
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Visibility changes (workspace switches)
    const handleVisibilityChange = async () => {
      if (!document.hidden && isMonitoring && isWayland && !hasDataControl) {
        await readClipboardOnFocus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (unlistenFocus) unlistenFocus();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [systemInfo, isMonitoring, readClipboardOnFocus]);

  return {
    systemInfo,
    hasWindowFocus,
    previousContentRef,
  };
};
