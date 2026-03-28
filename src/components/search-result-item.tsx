import { useEffect, useRef } from "react";
import { motion } from "motion/react";

import { ClipboardItem } from "@/components/clipboard-item";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";

export const SearchResultItem = ({
  item,
  isActive,
  onCopy,
  onDelete,
  onToggleFavorite,
}: {
  item: ClipboardItemType;
  isActive: boolean;
  onCopy: (item: ClipboardItemType) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}) => {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);

  return (
    <motion.li
      ref={ref}
      role="option"
      aria-selected={isActive}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className={`list-none rounded-xl transition-shadow ${
        isActive ? "ring-2 ring-ring" : ""
      }`}
    >
      <ClipboardItem
        item={item}
        onCopy={onCopy}
        onDelete={onDelete}
        onToggleFavorite={onToggleFavorite}
      />
    </motion.li>
  );
};
