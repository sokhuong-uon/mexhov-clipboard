import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

const DEFAULTS = {
  history_limit: 50,
} as const;

type SettingsKey = keyof typeof DEFAULTS;

export const useSettings = () => {
  const [historyLimit, setHistoryLimitState] = useState<number>(
    DEFAULTS.history_limit,
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    invoke<string | null>("get_setting", { key: "history_limit" })
      .then((value) => {
        if (value) {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed) && parsed > 0) {
            setHistoryLimitState(parsed);
          }
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const setHistoryLimit = useCallback(async (limit: number) => {
    setHistoryLimitState(limit);
    await invoke("set_setting", {
      key: "history_limit" satisfies SettingsKey,
      value: String(limit),
    });
  }, []);

  return {
    historyLimit,
    setHistoryLimit,
    isLoaded,
  };
};
