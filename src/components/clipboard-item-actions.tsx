import { Copy, Check, Trash2, SplitSquareHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type ClipboardItemActionsProps = {
  isCopied: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onSplitEnv?: () => void;
  showSplit: boolean;
};

export const ClipboardItemActions = ({
  isCopied,
  onCopy,
  onDelete,
  onSplitEnv,
  showSplit,
}: ClipboardItemActionsProps) => {
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={isCopied ? undefined : onCopy}
              className={isCopied ? "text-green-500" : "text-muted-foreground hover:text-foreground"}
            />
          }
        >
          {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </TooltipTrigger>
        <TooltipContent className="pointer-events-none">
          {isCopied ? "Currently in clipboard" : "Copy to clipboard"}
        </TooltipContent>
      </Tooltip>

      {showSplit && onSplitEnv && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onSplitEnv}
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
              onClick={onDelete}
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
  );
};
