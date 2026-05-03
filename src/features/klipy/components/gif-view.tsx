import { useCallback } from "react";

import { GifFeed } from "@/features/klipy/components/gif-feed";
import { GifSearchBox } from "@/features/klipy/components/gif-search-box";
import { useKlipyFeed } from "@/features/klipy/hooks/use-klipy-feed";
import { getKlipyPasteUrl } from "@/features/klipy/utils/klipy-url";
import { type Klipy } from "@/features/klipy/schema/klipy";
import { useGifSearchQueryStore } from "@/features/klipy/stores/gif-search-query-store";
import { useClipboard } from "@/hooks/use-clipboard";

type GifViewProps = {
  onPaste?: (item: Klipy) => void;
  isActive?: boolean;
};

export function GifView({ onPaste, isActive = true }: GifViewProps) {
  const searchQuery = useGifSearchQueryStore((state) => state.searchQuery);
  const feed = useKlipyFeed(searchQuery);
  const clipboard = useClipboard();

  const handleSelect = useCallback(
    async (item: Klipy) => {
      const pasteUrl = getKlipyPasteUrl(item);
      if (pasteUrl) await clipboard.write(pasteUrl);
    },
    [clipboard.write],
  );

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="px-4 py-1">
        <GifSearchBox className="flex-1 min-w-0" isActive={isActive} />
      </div>

      <GifFeed
        feed={feed}
        isActive={isActive}
        onSelect={handleSelect}
        onPaste={onPaste}
      />
    </div>
  );
}
