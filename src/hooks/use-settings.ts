import { useState, useCallback, useEffect } from "react";
import { commands } from "@/bindings";

export const PAGE_LIMIT_OPTIONS = [10, 15, 20, 50, 100] as const;

const DEFAULTS = {
  history_limit: 10,
} as const;

type SettingsKey = keyof typeof DEFAULTS;

const isValidPageLimit = (value: number): boolean =>
  (PAGE_LIMIT_OPTIONS as readonly number[]).includes(value);

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
          if (isValidPageLimit(parsed)) {
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
