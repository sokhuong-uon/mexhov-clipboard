import type { ReactNode } from "react";
import { AnimatePresence } from "motion/react";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { ClipboardItem as ClipboardItemType } from "@/types/clipboard";

type ClipboardItemsGridProps = {
  items: ClipboardItemType[];
  ariaLabel?: string;
  renderItem: (item: ClipboardItemType, index: number) => ReactNode;
  footer?: ReactNode;
};

export function ClipboardItemsGrid({
  items,
  ariaLabel,
  renderItem,
  footer,
}: ClipboardItemsGridProps) {
  return (
    <ScrollArea className="h-full">
      <ul
        className="grid grid-cols-1 gap-3 px-4 pt-1 md:grid-cols-2"
        role={ariaLabel ? "listbox" : undefined}
        aria-label={ariaLabel}
      >
        <AnimatePresence initial={false}>
          {items.map((item, index) => renderItem(item, index))}
        </AnimatePresence>
        {footer}
      </ul>
    </ScrollArea>
  );
}
