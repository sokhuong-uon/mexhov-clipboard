import { useEffect } from "react";
import { useTheme } from "next-themes";

export function useSystemTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mq.matches ? "dark" : "light");

    const onChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setTheme]);
}
