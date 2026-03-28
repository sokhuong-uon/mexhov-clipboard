import { GripHorizontal } from "lucide-react";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardItemContent } from "@/components/clipboard-item-content";
import { ClipboardItemMeta } from "@/components/clipboard-item-meta";
import { ClipboardItemActions } from "@/components/clipboard-item-actions";

type ClipboardItemProps = {
  item: ClipboardItemType;
  onCopy: (item: ClipboardItemType) => void;
  onDelete: (id: number) => void;
  onToggleFavorite?: (id: number) => void;
  onSplitEnv?: (id: number) => void;
};

export const ClipboardItem = ({
  item,
  onCopy,
  onDelete,
  onSplitEnv,
}: ClipboardItemProps) => {
  return (
    <Card className="gap-2 py-3 group">
      <CardContent className="flex items-start gap-2 px-1 relative">
        <div className="flex items-center absolute left-1/2 -top-2 -translate-x-1/2 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing shrink-0">
          <GripHorizontal className="size-3.5" />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0 pl-2">
          <ClipboardItemContent item={item} />
          <ClipboardItemMeta item={item} />
        </div>

        <ClipboardItemActions
          onCopy={() => onCopy(item)}
          onDelete={() => onDelete(item.id)}
          onSplitEnv={onSplitEnv ? () => onSplitEnv(item.id) : undefined}
          showSplit={!!item.is_env && !item.kv_key}
        />
      </CardContent>
    </Card>
  );
};
