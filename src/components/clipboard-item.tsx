import { Copy, Trash2, Image } from "lucide-react";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";
import { formatTime, truncateText } from "@/utils/formatting";
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
  onDelete: (id: string) => void;
};

export const ClipboardItem = ({
  item,
  onCopy,
  onDelete,
}: ClipboardItemProps) => {
  const isImage = item.type === "image";

  return (
    <li className="list-none">
      <Card size="sm" className="gap-2 py-3">
        <CardContent className="flex items-center justify-between">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {isImage ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Image className="size-4" />
                  <span className="text-sm">
                    Image ({item.imageWidth}×{item.imageHeight})
                  </span>
                </div>
                {item.imageData && (
                  <img
                    src={`data:image/png;base64,${item.imageData}`}
                    alt="Clipboard image"
                    className="max-w-full max-h-32 rounded-md object-contain bg-muted"
                    style={{
                      maxWidth: Math.min(item.imageWidth || 200, 200),
                    }}
                  />
                )}
              </div>
            ) : (
              <p className="wrap-break-word text-card-foreground">
                {truncateText(item.text || "")}
              </p>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTime(item.timestamp)}
            </span>
          </div>

          <div className="flex items-center gap-1 ml-4 shrink-0">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onCopy(item)}
                  />
                }
              >
                <Copy className="size-4" />
              </TooltipTrigger>
              <TooltipContent>
                {isImage ? "Copy image to clipboard" : "Copy to clipboard"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDelete(item.id)}
                  />
                }
              >
                <Trash2 className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Delete from history</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </li>
  );
};
