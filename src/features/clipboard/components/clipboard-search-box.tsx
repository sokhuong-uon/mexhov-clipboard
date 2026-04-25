import { Input } from "@/components/ui/input";
import { useClipboardSearchQueryStore } from "@/features/clipboard/stores/clipboard-search-query-store";
import { useClipboardNoteStore } from "@/features/clipboard/stores/clipboard-note-store";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Search } from "lucide-react";
import { ComponentProps, useRef } from "react";
import { useHotkeysConfig } from "@/features/hotkey/hooks/use-hotkeys-config";
import { cn } from "@/utils/cn";
import { useDebouncedCallback } from "@tanstack/react-pacer";

export function ClipboardSearchBox({ className }: ComponentProps<"div">) {
  const ref = useRef<HTMLInputElement>(null);

  const setSearchQuery = useClipboardSearchQueryStore(
    (state) => state.setSearchQuery,
  );
  const { isEditingNote } = useClipboardNoteStore();

  const { hotkeys } = useHotkeysConfig();

  const debouncedSetSearchQuery = useDebouncedCallback(setSearchQuery, {
    wait: 150,
  });

  const focusSearch = () => {
    ref.current?.focus();
  };

  useHotkey(hotkeys.search, focusSearch, {
    enabled: !isEditingNote,
    ignoreInputs: true,
  });

  return (
    <div className={cn("relative size-full", className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />

      <Input
        ref={ref}
        type="search"
        placeholder="Search clipboard…"
        aria-label="Search clipboard history"
        onChange={(event) => debouncedSetSearchQuery(event.target.value)}
        className="pl-8 h-10 border-none ring-2 ring-muted"
      />
    </div>
  );
}
