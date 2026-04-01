import { memo, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { motion } from "motion/react";

import { ClipboardItem } from "@/components/clipboard-item";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";

export const SortableItem = memo(function SortableItem({
  item,
  index,
  isActive,
  isCopied,
  onCopy,
  onDelete,
  onToggleFavorite,
  onSplitEnv,
  colorMenuOpen,
  onColorMenuOpenChange,
}: {
  item: ClipboardItemType;
  index: number;
  isActive: boolean;
  isCopied: boolean;
  onCopy: (item: ClipboardItemType) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onSplitEnv?: (id: number) => void;
  colorMenuOpen?: boolean;
  onColorMenuOpenChange?: (open: boolean) => void;
}) {
  const {
    ref: sortableRef,
    handleRef,
    isDragging,
  } = useSortable({
    id: item.id,
    index,
  });
  const scrollRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (isActive && scrollRef.current) {
      scrollRef.current.scrollIntoView({ block: "nearest" });
      scrollRef.current.focus({ preventScroll: true });
    }
  }, [isActive]);

  return (
    <motion.li
      ref={(el) => {
        sortableRef(el);
        scrollRef.current = el;
      }}
      initial={{ opacity: 0, y: -8 }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        y: 0,
        scale: isDragging ? 1.02 : 1,
      }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      tabIndex={isActive ? 0 : -1}
      className={`list-none rounded-xl transition-shadow outline-none ${isActive ? "ring-2 ring-ring" : ""}`}
    >
      <ClipboardItem
        item={item}
        isCopied={isCopied}
        dragHandleRef={handleRef}
        onCopy={onCopy}
        onDelete={onDelete}
        onToggleFavorite={onToggleFavorite}
        onSplitEnv={onSplitEnv}
        colorMenuOpen={colorMenuOpen}
        onColorMenuOpenChange={onColorMenuOpenChange}
      />
    </motion.li>
  );
});
