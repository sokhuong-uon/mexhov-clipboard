import { useState, useCallback, useEffect } from "react";
import { commands } from "@/bindings";

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
    (async () => {
      try {
        const result = await commands.getSetting("history_limit");
        if (result.status === "ok" && result.data) {
          const parsed = parseInt(result.data, 10);
          if (!isNaN(parsed) && parsed > 0) {
            setHistoryLimitState(parsed);
          }
        }
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setHistoryLimit = useCallback(async (limit: number) => {
    setHistoryLimitState(limit);
    await commands.setSetting(
      "history_limit" satisfies SettingsKey,
      String(limit),
    );
  }, []);

  return {
    historyLimit,
    setHistoryLimit,
    isLoaded,
  };
};
