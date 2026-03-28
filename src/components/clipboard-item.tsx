import { Copy, Trash2, Image, GripVertical, SplitSquareHorizontal } from "lucide-react";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";
import { formatTime, truncateText, formatCharCount } from "@/utils/formatting";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

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
  const isImage = item.content_type === "image";
  const timestamp = new Date(parseInt(item.created_at));

  return (
    <Card size="sm" className="gap-2 py-3 group">
      <CardContent className="flex items-start gap-2">
        <div className="flex items-center pt-1 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="size-3.5" />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {isImage ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Image className="size-4" />
                <span className="text-sm">
                  Image ({item.image_width}x{item.image_height})
                </span>
              </div>
              {item.image_data && (
                <img
                  src={`data:image/png;base64,${item.image_data}`}
                  alt="Clipboard image"
                  className="max-w-full max-h-32 rounded-md object-contain bg-muted"
                  style={{
                    maxWidth: Math.min(item.image_width || 200, 200),
                  }}
                />
              )}
            </div>
          ) : (
            <p className="wrap-break-word text-card-foreground text-sm leading-relaxed">
              {truncateText(item.text_content || "")}
            </p>
          )}

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {item.kv_key && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 font-mono text-sky-500 border-sky-500/40"
              >
                {item.kv_key}
              </Badge>
            )}
            {item.is_env && !item.kv_key && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 text-amber-500 border-amber-500/40"
              >
                kv
              </Badge>
            )}
            <span>{formatTime(timestamp)}</span>
            {!isImage && item.char_count != null && (
              <>
                <span className="opacity-30">·</span>
                <span>{formatCharCount(item.char_count)}</span>
              </>
            )}
            {!isImage && item.line_count != null && item.line_count > 1 && (
              <>
                <span className="opacity-30">·</span>
                <span>{item.line_count} lines</span>
              </>
            )}
            {item.copy_count > 1 && (
              <>
                <span className="opacity-30">·</span>
                <span>copied {item.copy_count}x</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onCopy(item)}
                  className="text-muted-foreground hover:text-foreground"
                />
              }
            >
              <Copy className="size-3.5" />
            </TooltipTrigger>

            <TooltipContent className="pointer-events-none">
              Copy to clipboard
            </TooltipContent>
          </Tooltip>

          {item.is_env && !item.kv_key && onSplitEnv && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onSplitEnv(item.id)}
                    className="text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <SplitSquareHorizontal className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent className="pointer-events-none">
                Split into key-value items
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDelete(item.id)}
                  className="text-muted-foreground hover:text-foreground"
                />
              }
            >
              <Trash2 className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="pointer-events-none">
              Delete from history
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
};
