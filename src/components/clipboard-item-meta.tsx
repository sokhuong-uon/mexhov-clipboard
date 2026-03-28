import { Clock } from "lucide-react";
import { ClipboardItem } from "@/types/clipboard";
import {
  formatTime,
  formatRelativeDate,
  formatFullDate,
} from "@/utils/formatting";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export const ClipboardItemMeta = ({ item }: { item: ClipboardItem }) => {
  const timestamp = new Date(parseInt(item.created_at));

  return (
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
      {item.detected_date && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                variant="outline"
                className="px-1.5 gap-1 text-violet-400 border-violet-400/40 cursor-default"
              >
                <Clock className="size-2.5" />
                {formatRelativeDate(item.detected_date)}
              </Badge>
            }
          />
          <TooltipContent className="pointer-events-none">
            {formatFullDate(item.detected_date)}
          </TooltipContent>
        </Tooltip>
      )}
      <span>{formatTime(timestamp)}</span>
      {item.copy_count > 1 && (
        <>
          <span className="opacity-30">·</span>
          <span>copied {item.copy_count}x</span>
        </>
      )}
    </div>
  );
};
