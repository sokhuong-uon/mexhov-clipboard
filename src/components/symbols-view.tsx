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

const QUICK_PASTE_LIMIT = 9;

type Symbol = {
  char: string;
  name: string;
};

type SymbolCategory = {
  label: string;
  symbols: Symbol[];
};

const SYMBOL_DATA: SymbolCategory[] = [
  {
    label: "Dashes & Punctuation",
    symbols: [
      { char: "\u2014", name: "Em Dash" },
      { char: "\u2013", name: "En Dash" },
      { char: "\u2015", name: "Horizontal Bar" },
      { char: "\u2012", name: "Figure Dash" },
      { char: "\u2026", name: "Ellipsis" },
      { char: "\u2022", name: "Bullet" },
      { char: "\u25E6", name: "White Bullet" },
      { char: "\u2023", name: "Triangular Bullet" },
      { char: "\u00B7", name: "Middle Dot" },
      { char: "\u2018", name: "Left Single Quote" },
      { char: "\u2019", name: "Right Single Quote" },
      { char: "\u201C", name: "Left Double Quote" },
      { char: "\u201D", name: "Right Double Quote" },
      { char: "\u201A", name: "Single Low-9 Quote" },
      { char: "\u201E", name: "Double Low-9 Quote" },
      { char: "\u00AB", name: "Left Guillemet" },
      { char: "\u00BB", name: "Right Guillemet" },
      { char: "\u2039", name: "Left Single Guillemet" },
      { char: "\u203A", name: "Right Single Guillemet" },
      { char: "\u00A7", name: "Section" },
      { char: "\u00B6", name: "Pilcrow" },
      { char: "\u2020", name: "Dagger" },
      { char: "\u2021", name: "Double Dagger" },
      { char: "\u203C", name: "Double Exclamation" },
      { char: "\u2047", name: "Double Question" },
      { char: "\u2048", name: "Question Exclamation" },
      { char: "\u2049", name: "Exclamation Question" },
      { char: "\u204B", name: "Reversed Pilcrow" },
      { char: "\u2053", name: "Swung Dash" },
      { char: "\u2043", name: "Hyphen Bullet" },
    ],
  },
  {
    label: "Arrows",
    symbols: [
      { char: "\u2190", name: "Left Arrow" },
      { char: "\u2191", name: "Up Arrow" },
      { char: "\u2192", name: "Right Arrow" },
      { char: "\u2193", name: "Down Arrow" },
      { char: "\u2194", name: "Left-Right Arrow" },
      { char: "\u2195", name: "Up-Down Arrow" },
      { char: "\u2196", name: "Upper-Left Arrow" },
      { char: "\u2197", name: "Upper-Right Arrow" },
      { char: "\u2198", name: "Lower-Right Arrow" },
      { char: "\u2199", name: "Lower-Left Arrow" },
      { char: "\u21D0", name: "Left Double Arrow" },
      { char: "\u21D1", name: "Up Double Arrow" },
      { char: "\u21D2", name: "Right Double Arrow" },
      { char: "\u21D3", name: "Down Double Arrow" },
      { char: "\u21D4", name: "Left-Right Double Arrow" },
      { char: "\u21D5", name: "Up-Down Double Arrow" },
      { char: "\u21B0", name: "Up Arrow with Tip Left" },
      { char: "\u21B1", name: "Up Arrow with Tip Right" },
      { char: "\u21B2", name: "Down Arrow with Tip Left" },
      { char: "\u21B3", name: "Down Arrow with Tip Right" },
      { char: "\u21BA", name: "Anticlockwise Arrow" },
      { char: "\u21BB", name: "Clockwise Arrow" },
      { char: "\u21A9", name: "Left Arrow with Hook" },
      { char: "\u21AA", name: "Right Arrow with Hook" },
      { char: "\u27A4", name: "Right Arrowhead" },
      { char: "\u2794", name: "Heavy Right Arrow" },
      { char: "\u279C", name: "Heavy Round-Tipped Right Arrow" },
      { char: "\u27F5", name: "Long Left Arrow" },
      { char: "\u27F6", name: "Long Right Arrow" },
      { char: "\u27F7", name: "Long Left-Right Arrow" },
    ],
  },
  {
    label: "Math",
    symbols: [
      { char: "\u00D7", name: "Multiplication" },
      { char: "\u00F7", name: "Division" },
      { char: "\u00B1", name: "Plus-Minus" },
      { char: "\u2213", name: "Minus-Plus" },
      { char: "\u2212", name: "Minus" },
      { char: "\u2260", name: "Not Equal" },
      { char: "\u2248", name: "Approximately Equal" },
      { char: "\u2261", name: "Identical To" },
      { char: "\u2262", name: "Not Identical To" },
      { char: "\u2264", name: "Less Than or Equal" },
      { char: "\u2265", name: "Greater Than or Equal" },
      { char: "\u226A", name: "Much Less Than" },
      { char: "\u226B", name: "Much Greater Than" },
      { char: "\u221A", name: "Square Root" },
      { char: "\u221B", name: "Cube Root" },
      { char: "\u221E", name: "Infinity" },
      { char: "\u2211", name: "Summation" },
      { char: "\u220F", name: "Product" },
      { char: "\u222B", name: "Integral" },
      { char: "\u222C", name: "Double Integral" },
      { char: "\u2202", name: "Partial Differential" },
      { char: "\u2207", name: "Nabla" },
      { char: "\u2200", name: "For All" },
      { char: "\u2203", name: "There Exists" },
      { char: "\u2204", name: "Does Not Exist" },
      { char: "\u2208", name: "Element Of" },
      { char: "\u2209", name: "Not Element Of" },
      { char: "\u2282", name: "Subset Of" },
      { char: "\u2283", name: "Superset Of" },
      { char: "\u2229", name: "Intersection" },
      { char: "\u222A", name: "Union" },
      { char: "\u2227", name: "Logical And" },
      { char: "\u2228", name: "Logical Or" },
      { char: "\u00AC", name: "Not" },
      { char: "\u0394", name: "Delta" },
      { char: "\u03C0", name: "Pi" },
      { char: "\u03B1", name: "Alpha" },
      { char: "\u03B2", name: "Beta" },
      { char: "\u03B3", name: "Gamma" },
      { char: "\u03B8", name: "Theta" },
      { char: "\u03BB", name: "Lambda" },
      { char: "\u03BC", name: "Mu" },
      { char: "\u03C3", name: "Sigma" },
      { char: "\u03C6", name: "Phi" },
      { char: "\u03C9", name: "Omega" },
      { char: "\u00B2", name: "Superscript 2" },
      { char: "\u00B3", name: "Superscript 3" },
      { char: "\u2070", name: "Superscript 0" },
      { char: "\u00B9", name: "Superscript 1" },
      { char: "\u2074", name: "Superscript 4" },
      { char: "\u207F", name: "Superscript n" },
      { char: "\u00BC", name: "Fraction 1/4" },
      { char: "\u00BD", name: "Fraction 1/2" },
      { char: "\u00BE", name: "Fraction 3/4" },
      { char: "\u2153", name: "Fraction 1/3" },
      { char: "\u2154", name: "Fraction 2/3" },
      { char: "\u2030", name: "Per Mille" },
      { char: "\u2031", name: "Per Ten Thousand" },
    ],
  },
  {
    label: "Currency",
    symbols: [
      { char: "$", name: "Dollar" },
      { char: "\u20AC", name: "Euro" },
      { char: "\u00A3", name: "Pound" },
      { char: "\u00A5", name: "Yen / Yuan" },
      { char: "\u20A3", name: "Franc" },
      { char: "\u20B9", name: "Rupee" },
      { char: "\u20A9", name: "Won" },
      { char: "\u20BF", name: "Bitcoin" },
      { char: "\u00A2", name: "Cent" },
      { char: "\u20B1", name: "Peso" },
      { char: "\u20B4", name: "Hryvnia" },
      { char: "\u20BA", name: "Turkish Lira" },
      { char: "\u20BD", name: "Ruble" },
      { char: "\u20AB", name: "Dong" },
      { char: "\u20B5", name: "Cedi" },
      { char: "\u20B8", name: "Tenge" },
    ],
  },
  {
    label: "Legal & Marks",
    symbols: [
      { char: "\u00A9", name: "Copyright" },
      { char: "\u00AE", name: "Registered" },
      { char: "\u2122", name: "Trademark" },
      { char: "\u2117", name: "Sound Recording Copyright" },
      { char: "\u2120", name: "Service Mark" },
      { char: "\u00B0", name: "Degree" },
      { char: "\u2103", name: "Degree Celsius" },
      { char: "\u2109", name: "Degree Fahrenheit" },
      { char: "\u2116", name: "Numero" },
      { char: "\u2114", name: "L B Bar" },
    ],
  },
  {
    label: "Shapes & Geometry",
    symbols: [
      { char: "\u25A0", name: "Black Square" },
      { char: "\u25A1", name: "White Square" },
      { char: "\u25B2", name: "Black Up Triangle" },
      { char: "\u25B3", name: "White Up Triangle" },
      { char: "\u25BC", name: "Black Down Triangle" },
      { char: "\u25BD", name: "White Down Triangle" },
      { char: "\u25C0", name: "Black Left Triangle" },
      { char: "\u25B6", name: "Black Right Triangle" },
      { char: "\u25CF", name: "Black Circle" },
      { char: "\u25CB", name: "White Circle" },
      { char: "\u25C6", name: "Black Diamond" },
      { char: "\u25C7", name: "White Diamond" },
      { char: "\u25CA", name: "Lozenge" },
      { char: "\u2B1A", name: "Dotted Square" },
      { char: "\u2B24", name: "Large Black Circle" },
      { char: "\u2B25", name: "Black Medium Diamond" },
    ],
  },
  {
    label: "Misc",
    symbols: [
      { char: "\u2605", name: "Black Star" },
      { char: "\u2606", name: "White Star" },
      { char: "\u2665", name: "Heart" },
      { char: "\u2661", name: "White Heart" },
      { char: "\u2666", name: "Diamond" },
      { char: "\u2662", name: "White Diamond Suit" },
      { char: "\u2663", name: "Club" },
      { char: "\u2667", name: "White Club Suit" },
      { char: "\u2660", name: "Spade" },
      { char: "\u2664", name: "White Spade Suit" },
      { char: "\u266A", name: "Eighth Note" },
      { char: "\u266B", name: "Beamed Eighth Notes" },
      { char: "\u266C", name: "Beamed Sixteenth Notes" },
      { char: "\u266D", name: "Flat" },
      { char: "\u266E", name: "Natural" },
      { char: "\u266F", name: "Sharp" },
      { char: "\u2713", name: "Check Mark" },
      { char: "\u2714", name: "Heavy Check Mark" },
      { char: "\u2717", name: "Ballot X" },
      { char: "\u2718", name: "Heavy Ballot X" },
      { char: "\u2720", name: "Maltese Cross" },
      { char: "\u2721", name: "Star of David" },
      { char: "\u262F", name: "Yin Yang" },
      { char: "\u2638", name: "Wheel of Dharma" },
      { char: "\u2602", name: "Umbrella" },
      { char: "\u2603", name: "Snowman" },
      { char: "\u2604", name: "Comet" },
      { char: "\u260E", name: "Telephone" },
      { char: "\u2615", name: "Hot Beverage" },
      { char: "\u261E", name: "Pointing Right" },
      { char: "\u270E", name: "Pencil" },
      { char: "\u2702", name: "Scissors" },
      { char: "\u2709", name: "Envelope" },
      { char: "\u00A0", name: "Non-Breaking Space" },
      { char: "\u200B", name: "Zero-Width Space" },
      { char: "\u200D", name: "Zero-Width Joiner" },
      { char: "\u200C", name: "Zero-Width Non-Joiner" },
      { char: "\u2060", name: "Word Joiner" },
      { char: "\uFEFF", name: "Zero-Width No-Break Space" },
    ],
  },
];

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
              <div className="grid grid-cols-8 gap-0.5">
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
