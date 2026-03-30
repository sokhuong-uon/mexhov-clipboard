import { useCallback, useRef, useState } from "react";
import { GripHorizontal } from "lucide-react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { invoke } from "@tauri-apps/api/core";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardItemContent } from "@/components/clipboard-item-content";
import { ClipboardItemMeta } from "@/components/clipboard-item-meta";
import { ClipboardItemActions } from "@/components/clipboard-item-actions";
import { cn } from "@/lib/utils";

const COLOR_FORMATS = [
  { format: "hex", label: "HEX" },
  { format: "hex-no-hash", label: "HEX (no #)" },
  { format: "rgb", label: "RGB" },
  { format: "hsl", label: "HSL" },
  { format: "hwb", label: "HWB" },
  { format: "oklch", label: "OKLCH" },
] as const;

type ClipboardItemProps = {
  item: ClipboardItemType;
  isCopied: boolean;
  dragHandleRef?: (element: Element | null) => void;
  onCopy: (item: ClipboardItemType) => void;
  onDelete: (id: number) => void;
  onToggleFavorite?: (id: number) => void;
  onSplitEnv?: (id: number) => void;
  colorMenuOpen?: boolean;
  onColorMenuOpenChange?: (open: boolean) => void;
};

export const ClipboardItem = ({
  item,
  isCopied,
  dragHandleRef,
  onCopy,
  onDelete,
  onSplitEnv,
  colorMenuOpen,
  onColorMenuOpenChange,
}: ClipboardItemProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const virtualAnchorRef = useRef<{ x: number; y: number } | null>(null);

  const menuOpen = colorMenuOpen ?? false;
  const setMenuOpen = useCallback(
    (open: boolean) => onColorMenuOpenChange?.(open),
    [onColorMenuOpenChange],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!item.detected_color) return;
      e.preventDefault();
      virtualAnchorRef.current = { x: e.clientX, y: e.clientY };
      setMenuOpen(true);
    },
    [item.detected_color, setMenuOpen],
  );

  const getAnchor = ():
    | Element
    | { getBoundingClientRect: () => DOMRect }
    | null => {
    const pos = virtualAnchorRef.current;
    if (pos) {
      return { getBoundingClientRect: () => new DOMRect(pos.x, pos.y, 0, 0) };
    }
    return cardRef.current;
  };

  const handleCopyAs = useCallback(
    async (format: string) => {
      const text = item.text_content || item.detected_color || "";
      const converted = await invoke<string>("convert_color", { text, format });
      await invoke("write_clipboard", { text: converted });
      setMenuOpen(false);
    },
    [item.text_content, item.detected_color, setMenuOpen],
  );

  return (
    <>
      <Card
        ref={cardRef}
        className="gap-2 py-3 group"
        onDoubleClick={() => onCopy(item)}
        onContextMenu={handleContextMenu}
      >
        <CardContent className="flex items-start gap-2 px-1 relative">
          <div
            ref={dragHandleRef}
            className="flex items-center absolute left-1/2 -top-2 -translate-x-1/2 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripHorizontal className="size-3.5" />
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-0 pl-2">
            <ClipboardItemContent item={item} />
            <ClipboardItemMeta item={item} />
          </div>

          <div className="flex flex-col items-center shrink-0">
            {item.is_favorite && (
              <div className="size-1.5 rounded-full bg-amber-500/70 mb-0.5" />
            )}
            <ClipboardItemActions
              isCopied={isCopied}
              onCopy={() => onCopy(item)}
              onDelete={() => onDelete(item.id)}
              onSplitEnv={onSplitEnv ? () => onSplitEnv(item.id) : undefined}
              showSplit={!!item.is_env && !item.kv_key}
            />
          </div>
        </CardContent>
      </Card>

      {item.detected_color && (
        <MenuPrimitive.Root
          open={menuOpen}
          onOpenChange={(open) => {
            if (!open) virtualAnchorRef.current = null;
            setMenuOpen(open);
          }}
        >
          <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner
              className="isolate z-50 outline-none"
              side="bottom"
              align="start"
              anchor={getAnchor}
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
                    <ColorPreview
                      text={item.text_content || item.detected_color!}
                      format={format}
                    />
                  </MenuPrimitive.Item>
                ))}
              </MenuPrimitive.Popup>
            </MenuPrimitive.Positioner>
          </MenuPrimitive.Portal>
        </MenuPrimitive.Root>
      )}
    </>
  );
};

const ColorPreview = ({ text, format }: { text: string; format: string }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fetched = useRef(false);

  if (!fetched.current) {
    fetched.current = true;
    invoke<string>("convert_color", { text, format }).then(setPreview);
  }

  return preview ? (
    <span className="font-mono text-xs text-muted-foreground truncate max-w-44">
      {preview}
    </span>
  ) : null;
};
