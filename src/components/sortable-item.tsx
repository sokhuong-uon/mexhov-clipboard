import { useSortable } from "@dnd-kit/react/sortable";
import { motion } from "motion/react";

import { ClipboardItem } from "@/components/clipboard-item";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";

export const SortableItem = ({
  item,
  index,
  isCopied,
  onCopy,
  onDelete,
  onToggleFavorite,
  onSplitEnv,
}: {
  item: ClipboardItemType;
  index: number;
  isCopied: boolean;
  onCopy: (item: ClipboardItemType) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onSplitEnv?: (id: number) => void;
}) => {
  const { ref, handleRef, isDragging } = useSortable({
    id: item.id,
    index,
  });

  return (
    <motion.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        y: 0,
        scale: isDragging ? 1.02 : 1,
      }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="list-none"
    >
      <ClipboardItem
        item={item}
        isCopied={isCopied}
        dragHandleRef={handleRef}
        onCopy={onCopy}
        onDelete={onDelete}
        onToggleFavorite={onToggleFavorite}
        onSplitEnv={onSplitEnv}
      />
    </motion.li>
  );
};
