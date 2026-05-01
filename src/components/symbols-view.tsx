import { useEffect, useMemo, useState } from "react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { QuickPasteBadge } from "@/components/quick-paste-badge";
import {
  QUICK_PASTE_MODIFIER,
  useModifierHeld,
} from "@/features/hotkey/hooks/use-modifier-held";
import { SymbolsSearchBox } from "@/features/symbols/components/symbols-search-box";
import { useSymbolsSearchQueryStore } from "@/features/symbols/stores/symbols-search-query-store";
import { SYMBOL_DATA } from "@/lib/symbol-data";

const QUICK_PASTE_LIMIT = 9;

type SymbolsViewProps = {
  onSelect: (char: string) => void;
  onPaste?: (char: string) => void;
  isActive?: boolean;
};

export const SymbolsView = ({
  onSelect,
  onPaste,
  isActive = true,
}: SymbolsViewProps) => {
  const searchQuery = useSymbolsSearchQueryStore((state) => state.searchQuery);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SYMBOL_DATA;

    return SYMBOL_DATA.map((cat) => ({
      ...cat,
      symbols: cat.symbols.filter(
        (s) => s.name.toLowerCase().includes(q) || s.char === q,
      ),
    })).filter((cat) => cat.symbols.length > 0);
  }, [searchQuery]);

  // Flat ordering across categories so quick-paste numbering matches reading order
  const flatSymbols = useMemo(
    () => filtered.flatMap((cat) => cat.symbols),
    [filtered],
  );

  const quickIndexByChar = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < Math.min(flatSymbols.length, QUICK_PASTE_LIMIT); i++) {
      map.set(flatSymbols[i].char, i + 1);
    }
    return map;
  }, [flatSymbols]);

  const modifierHeld = useModifierHeld();

  useHotkeys(
    Array.from({ length: QUICK_PASTE_LIMIT }, (_, i) => ({
      hotkey: `Mod+${(i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` as const,
      callback: () => {
        const target = flatSymbols[i];
        if (!target) return;
        if (onPaste) onPaste(target.char);
        else onSelect(target.char);
      },
      options: { enabled: isActive && flatSymbols.length > i },
    })),
  );

  const [copied, setCopied] = useState<string | null>(null);

  const handleClick = (char: string) => {
    onSelect(char);
    setCopied(char);
  };

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 800);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="px-4 py-1">
        <SymbolsSearchBox className="flex-1 min-w-0" isActive={isActive} />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No symbols found
          </div>
        ) : (
          filtered.map((cat) => (
            <div key={cat.label} className="mt-3 first:mt-1">
              <h3 className="text-[11px] font-medium text-muted-foreground mb-1.5 px-0.5">
                {cat.label}
              </h3>

              <div className="grid grid-cols-6 gap-0.5">
                {cat.symbols.map((s) => {
                  const quickIndex = quickIndexByChar.get(s.char);
                  return (
                    <div key={s.char + s.name} className="relative">
                      {isActive && modifierHeld && quickIndex != null && (
                        <QuickPasteBadge
                          index={quickIndex}
                          className="-top-1 -left-1"
                        />
                      )}
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              aria-label={s.name}
                              aria-keyshortcuts={
                                quickIndex != null
                                  ? `${QUICK_PASTE_MODIFIER}+${quickIndex}`
                                  : undefined
                              }
                              onClick={() => handleClick(s.char)}
                              className={`flex w-full items-center justify-center rounded-lg aspect-square font-normal transition-all cursor-pointer select-none hover:bg-accent hover:text-accent-foreground active:scale-90 ${
                                copied === s.char
                                  ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                  : ""
                              }`}
                            />
                          }
                        >
                          <span className="text-base leading-none">
                            {s.char}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{s.name}</TooltipContent>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
