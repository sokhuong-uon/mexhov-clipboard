import { memo, useEffect, useRef } from "react";
import { motion } from "motion/react";

import { ClipboardItem } from "@/components/clipboard-item";
import { ClipboardItem as ClipboardItemType } from "@/types/clipboard";

export const SearchResultItem = memo(function SearchResultItem({
  item,
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
}: {
  item: ClipboardItemType;
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
}) {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
      ref.current.focus({ preventScroll: true });
    }
  }, [isActive]);

  return (
    <motion.li
      ref={ref}
      role="option"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className={`list-none rounded-xl transition-shadow outline-none ${
        isActive ? "ring-2 ring-ring" : ""
      }`}
    >
      <ClipboardItem
        item={item}
        isCopied={isCopied}
        quickIndex={quickIndex}
        onCopy={onCopy}
        onDelete={onDelete}
        onToggleFavorite={onToggleFavorite}
        onSplitEnv={onSplitEnv}
        onUpdateNote={onUpdateNote}
        colorMenuOpen={colorMenuOpen}
        onColorMenuOpenChange={onColorMenuOpenChange}
      />
    </motion.li>
  );
});
