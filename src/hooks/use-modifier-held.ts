import { useEffect, useState } from "react";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

const MODIFIER_KEY = isMac ? "Meta" : "Control";

function isModifierKey(key: string): boolean {
  return isMac ? key === "Meta" : key === "Control";
}

export function useModifierHeld(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (isModifierKey(e.key)) setHeld(true);
    };
    const handleUp = (e: KeyboardEvent) => {
      // Releasing the modifier itself: trust the key, not e.metaKey/ctrlKey
      // (browsers sometimes report the modifier as still active on its own keyup)
      if (isModifierKey(e.key)) {
        setHeld(false);
        return;
      }
      setHeld(isMac ? e.metaKey : e.ctrlKey);
    };
    const handlePointer = (e: PointerEvent) => {
      // Safety net: if the modifier was somehow left "stuck", any pointer
      // activity reflects the real OS-reported modifier state.
      setHeld(isMac ? e.metaKey : e.ctrlKey);
    };
    const handleBlur = () => setHeld(false);

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    window.addEventListener("pointermove", handlePointer);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return held;
}

export const QUICK_PASTE_MODIFIER = MODIFIER_KEY;
export const QUICK_PASTE_MODIFIER_SYMBOL = isMac ? "\u2318" : "\u2303";
