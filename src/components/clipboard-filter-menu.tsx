import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Funnel,
  FunnelPlus,
  Image,
  KeyRound,
  Link,
  Palette,
  ShieldAlert,
  Star,
  StickyNote,
} from "lucide-react";
import {
  ClipboardFilters,
  CONTENT_FILTER_LABELS,
  ContentFilter,
  DateRange,
  EMPTY_FILTERS,
} from "@/types/clipboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CONTENT_FILTER_ICONS: Record<ContentFilter, React.ReactNode> = {
  image: <Image className="size-4" />,
  secret: <ShieldAlert className="size-4" />,
  env: <KeyRound className="size-4" />,
  url: <Link className="size-4" />,
  color: <Palette className="size-4" />,
  date: <Calendar className="size-4" />,
  note: <StickyNote className="size-4" />,
};

const DATE_RANGE_OPTIONS: {
  value: DateRange;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "all",
    label: "All time",
    icon: <CalendarRange className="size-4" />,
  },
  { value: "today", label: "Today", icon: <Calendar className="size-4" /> },
  {
    value: "week",
    label: "Last 7 days",
    icon: <CalendarDays className="size-4" />,
  },
  {
    value: "month",
    label: "Last 30 days",
    icon: <CalendarDays className="size-4" />,
  },
];

type ClipboardFilterMenuProps = {
  filters: ClipboardFilters;
  onFiltersChange: (filters: ClipboardFilters) => void;
};

export const ClipboardFilterMenu = ({
  filters,
  onFiltersChange,
}: ClipboardFilterMenuProps) => {
  const hasActiveFilters =
    filters.favorite ||
    filters.contentTypes.size > 0 ||
    filters.dateRange !== "all";

  const activeFilterCount =
    (filters.favorite ? 1 : 0) +
    filters.contentTypes.size +
    (filters.dateRange !== "all" ? 1 : 0);

  const toggleFavorite = () => {
    onFiltersChange({ ...filters, favorite: !filters.favorite });
  };

  const toggleContentType = (type: ContentFilter) => {
    const next = new Set(filters.contentTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    onFiltersChange({ ...filters, contentTypes: next });
  };

  const setDateRange = (range: DateRange) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const clearFilters = () => {
    onFiltersChange({ ...EMPTY_FILTERS, contentTypes: new Set() });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              "shrink-0 text-neutral-400 dark:text-neutral-600 relative",
              hasActiveFilters && "text-amber-500 dark:text-amber-400",
            )}
            aria-label="Filter clipboard"
          />
        }
      >
        <Funnel className={cn("size-4", hasActiveFilters && "hidden")} />
        <FunnelPlus
          className={cn("size-4 hidden", hasActiveFilters && "block")}
        />
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center size-3.5 rounded-full bg-amber-500 text-[9px] font-bold text-white leading-none">
            {activeFilterCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={filters.favorite}
            onCheckedChange={toggleFavorite}
          >
            <Star className="size-4 text-amber-500" />
            Favorites only
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Content type</DropdownMenuLabel>
          {(Object.keys(CONTENT_FILTER_LABELS) as ContentFilter[]).map(
            (type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={filters.contentTypes.has(type)}
                onCheckedChange={() => toggleContentType(type)}
              >
                {CONTENT_FILTER_ICONS[type]}
                {CONTENT_FILTER_LABELS[type]}
              </DropdownMenuCheckboxItem>
            ),
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Date range</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.dateRange}
            onValueChange={(v) => setDateRange(v as DateRange)}
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                {opt.icon}
                {opt.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        {hasActiveFilters && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuCheckboxItem
                checked={false}
                onCheckedChange={clearFilters}
                className="text-muted-foreground"
              >
                Clear all filters
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
