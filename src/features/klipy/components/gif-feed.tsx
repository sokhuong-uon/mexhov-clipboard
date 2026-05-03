import { useCallback, useMemo } from "react";

import { buildQuickIndexBySlug } from "@/features/klipy/utils/build-quick-index-by-slug";
import { GifFeedEmpty } from "@/features/klipy/components/gif-feed-empty";
import { GifFeedError } from "@/features/klipy/components/gif-feed-error";
import { GifFeedLoading } from "@/features/klipy/components/gif-feed-loading";
import { GifGrid } from "@/features/klipy/components/gif-grid";
import { type KlipyFeed } from "@/features/klipy/hooks/use-klipy-feed";
import { useQuickPasteHotkeys } from "@/features/klipy/hooks/use-quick-paste-hotkeys";
import { type Klipy } from "@/features/klipy/schema/klipy";
import { useModifierHeld } from "@/features/hotkey/hooks/use-modifier-held";

type GifFeedProps = {
  feed: KlipyFeed;
  isActive: boolean;
  onSelect: (item: Klipy) => void;
  onPaste?: (item: Klipy) => void;
};

export function GifFeed({ feed, isActive, onSelect, onPaste }: GifFeedProps) {
  const modifierHeld = useModifierHeld();

  const handleQuickPasteTrigger = useCallback(
    (item: Klipy) => {
      if (onPaste) onPaste(item);
      else onSelect(item);
    },
    [onPaste, onSelect],
  );

  useQuickPasteHotkeys(feed.items, handleQuickPasteTrigger, isActive);

  const quickIndexBySlug = useMemo(
    () => buildQuickIndexBySlug(feed.items),
    [feed.items],
  );

  if (feed.isLoading) return <GifFeedLoading />;
  if (feed.isError) return <GifFeedError error={feed.error} />;
  if (feed.items.length === 0) {
    return <GifFeedEmpty isSearching={feed.isSearching} />;
  }

  return (
    <GifGrid
      items={feed.items}
      isActive={isActive}
      modifierHeld={modifierHeld}
      quickIndexBySlug={quickIndexBySlug}
      onSelect={onSelect}
      onReachEnd={feed.fetchNextPage}
      hasMore={feed.hasNextPage}
      isFetchingMore={feed.isFetchingNextPage}
    />
  );
}
