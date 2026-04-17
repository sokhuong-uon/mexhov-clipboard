import { useCallback } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { commands } from "@/bindings";
import { cn } from "@/lib/utils";
import { ColorPreview } from "@/components/color-preview";

const COLOR_FORMATS = [
  { format: "hex", label: "HEX" },
  { format: "hex-no-hash", label: "HEX (no #)" },
  { format: "rgb", label: "RGB" },
  { format: "hsl", label: "HSL" },
  { format: "hwb", label: "HWB" },
  { format: "oklch", label: "OKLCH" },
] as const;

type ColorFormatMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colorText: string;
  anchor: () => Element | { getBoundingClientRect: () => DOMRect } | null;
};

export function ColorFormatMenu({
  open,
  onOpenChange,
  colorText,
  anchor,
}: ColorFormatMenuProps) {
  const handleCopyAs = useCallback(
    async (format: string) => {
      const converted = await commands.convertColor(colorText, format);
      if (converted.status === "error") return;
      await commands.writeClipboard(converted.data);
      onOpenChange(false);
    },
    [colorText, onOpenChange],
  );

  return (
    <MenuPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner
          className="isolate z-50 outline-none"
          side="bottom"
          align="start"
          anchor={anchor}
        >
          <MenuPrimitive.Popup
            className="z-50 min-w-72 origin-(--transform-origin) overflow-hidden rounded-2xl bg-popover p-1 text-popover-foreground shadow-2xl ring-1 ring-foreground/5 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            onKeyDown={(e) => {
              const remap: Record<string, string> = {
                j: "ArrowDown",
                k: "ArrowUp",
              };
              if (remap[e.key]) {
                e.preventDefault();
                e.currentTarget.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: remap[e.key],
                    bubbles: true,
                  }),
                );
              }
            }}
          >
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Copy color as
            </div>
            {COLOR_FORMATS.map(({ format, label }) => (
              <MenuPrimitive.Item
                key={format}
                className={cn(
                  "relative flex cursor-default items-center justify-between gap-4 rounded-xl px-3 py-2 text-sm outline-hidden select-none",
                  "focus:bg-accent focus:text-accent-foreground",
                )}
                onClick={() => handleCopyAs(format)}
              >
                <span>{label}</span>
                <ColorPreview text={colorText} format={format} />
              </MenuPrimitive.Item>
            ))}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
