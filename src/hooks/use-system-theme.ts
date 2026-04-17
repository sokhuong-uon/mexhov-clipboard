import { useEffect } from "react";
import { useTheme } from "next-themes";
import { commands } from "@/bindings";

export function useSystemTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    commands.getSystemTheme().then(setTheme);
  }, [setTheme]);
}
