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
  quickIndex,
  onCopy,
  onDelete,
  onToggleFavorite,
  onSplitEnv,
  onUpdateNote,
  colorMenuOpen,
  onColorMenuOpenChange,
  onEditingNoteChange,
}: {
  item: ClipboardItemType;
  index: number;
  isActive: boolean;
  isCopied: boolean;
  quickIndex?: number | null;
  onCopy: (item: ClipboardItemType) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onSplitEnv?: (id: number) => void;
  onUpdateNote?: (id: number, note: string | null) => void;
  colorMenuOpen?: boolean;
  onColorMenuOpenChange?: (open: boolean) => void;
  onEditingNoteChange?: (editing: boolean) => void;
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
        quickIndex={quickIndex}
        dragHandleRef={handleRef}
        onCopy={onCopy}
        onDelete={onDelete}
        onToggleFavorite={onToggleFavorite}
        onSplitEnv={onSplitEnv}
        onUpdateNote={onUpdateNote}
        colorMenuOpen={colorMenuOpen}
        onColorMenuOpenChange={onColorMenuOpenChange}
        onEditingNoteChange={onEditingNoteChange}
      />
    </motion.li>
  );
});
