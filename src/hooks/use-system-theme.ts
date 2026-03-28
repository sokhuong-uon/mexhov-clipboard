import { useEffect } from "react";
import { useTheme } from "next-themes";
import { invoke } from "@tauri-apps/api/core";

export function useSystemTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    invoke<string>("get_system_theme").then((systemTheme) => {
      setTheme(systemTheme);
    });
  }, [setTheme]);
}
