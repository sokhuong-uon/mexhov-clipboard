import { QUICK_PASTE_MODIFIER_SYMBOL } from "@/hooks/use-modifier-held";

type QuickPasteBadgeProps = {
  index: number;
  className?: string;
};

export const QuickPasteBadge = ({ index, className }: QuickPasteBadgeProps) => (
  <kbd
    aria-hidden
    className={`absolute z-10 inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-sm ring-1 ring-black/5 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150 ${className ?? ""}`}
  >
    <span className="text-muted-foreground">
      {QUICK_PASTE_MODIFIER_SYMBOL}
    </span>
    <span>{index}</span>
  </kbd>
);
