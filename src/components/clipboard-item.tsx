import { memo, useCallback, useRef } from "react";
import { GripHorizontal } from "lucide-react";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardItemContent } from "@/components/clipboard-item-content";
import { ClipboardItemMeta } from "@/components/clipboard-item-meta";
import { ClipboardItemActions } from "@/components/clipboard-item-actions";
import { ColorFormatMenu } from "@/components/color-format-menu";

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

export const ClipboardItem = memo(function ClipboardItem({
  item,
  isCopied,
  dragHandleRef,
  onCopy,
  onDelete,
  onSplitEnv,
  colorMenuOpen,
  onColorMenuOpenChange,
}: ClipboardItemProps) {
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

  const getAnchor = useCallback(():
    | Element
    | { getBoundingClientRect: () => DOMRect }
    | null => {
    const pos = virtualAnchorRef.current;
    if (pos) {
      return { getBoundingClientRect: () => new DOMRect(pos.x, pos.y, 0, 0) };
    }
    return cardRef.current;
  }, []);

  const handleMenuOpenChange = useCallback(
    (open: boolean) => {
      if (!open) virtualAnchorRef.current = null;
      setMenuOpen(open);
    },
    [setMenuOpen],
  );

  const handleCopy = useCallback(() => onCopy(item), [onCopy, item]);
  const handleDelete = useCallback(
    () => onDelete(item.id),
    [onDelete, item.id],
  );
  const handleSplitEnv = useCallback(
    () => onSplitEnv?.(item.id),
    [onSplitEnv, item.id],
  );

  return (
    <>
      <Card
        ref={cardRef}
        className="gap-2 py-3 group"
        onDoubleClick={handleCopy}
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
              onCopy={handleCopy}
              onDelete={handleDelete}
              onSplitEnv={onSplitEnv ? handleSplitEnv : undefined}
              showSplit={!!item.is_env && !item.kv_key}
            />
          </div>
        </CardContent>
      </Card>

      {item.detected_color && (
        <ColorFormatMenu
          open={menuOpen}
          onOpenChange={handleMenuOpenChange}
          colorText={item.text_content || item.detected_color}
          anchor={getAnchor}
        />
      )}
    </>
  );
});
