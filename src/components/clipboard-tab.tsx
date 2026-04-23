import { useCallback, useState } from "react";

import { ErrorBanner } from "@/components/clipboard-error-banner";
import { ClipboardList } from "@/components/clipboard-list";
import { ClipboardItemSkeletonList } from "@/components/clipboard-item-skeleton";
import { ClipboardHeader } from "@/components/clipboard-window-header";
import type { useClipboard } from "@/hooks/use-clipboard";
import { useSettings } from "@/hooks/use-settings";
import { useHotkeysConfig } from "@/hooks/use-hotkeys-config";
import { useClipboardHistory } from "@/features/clipboard/hooks/use-clipboard-history";
import { useClipboardMonitor } from "@/hooks/use-clipboard-monitor";
import { useClipboardFilters } from "@/hooks/use-clipboard-filters";
import { ClipboardItem } from "@/types/clipboard";
import { useClipboardSearchQueryStore } from "@/features/clipboard/stores/clipboard-search-query-store";

type ClipboardTabProps = {
  clipboard: ReturnType<typeof useClipboard>;
  onPaste: (item: ClipboardItem) => Promise<void>;
  isActive: boolean;
};

export function ClipboardTab({
  clipboard,
  onPaste,
  isActive,
}: ClipboardTabProps) {
  const { readContent, write, writeImage, reinitialize, error, dismissError } =
    clipboard;

  const [isMonitoring, setIsMonitoring] = useState(true);

  const { searchQuery } = useClipboardSearchQueryStore();

  const [isEditingNote, setIsEditingNote] = useState(false);

  const { historyLimit, setHistoryLimit } = useSettings();
  const {
    hotkeys,
    setHotkey,
    resetHotkey,
    resetAll: resetAllHotkeys,
  } = useHotkeysConfig();

  const {
    history,
    hasMore,
    loadMore,
    isLoaded,
    currentContent,
    setCurrentContent,
    addContentToHistory,
    deleteItem,
    clearAll,
    toggleFavorite,
    reorderItems,
    splitEnvItem,
    updateNote,
  } = useClipboardHistory(historyLimit, false);

  const { systemInfo, previousContentRef } = useClipboardMonitor({
    onClipboardChange: addContentToHistory,
    onCurrentContentUpdate: setCurrentContent,
    isMonitoring,
  });

  const { filters, setFilters, filteredItems, toggleFavoriteFilter } =
    useClipboardFilters(history, searchQuery);

  const isSearching = searchQuery.trim().length > 0;

  const handleCopy = useCallback(
    async (item: ClipboardItem) => {
      if (item.content_type === "text" && item.text_content) {
        await write(item.text_content);
      } else if (item.content_type === "image" && item.image_data) {
        await writeImage(item.image_data);
      }
    },
    [write, writeImage],
  );

  const handleRetry = useCallback(async () => {
    await reinitialize();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const content = await readContent();
    if (content.type !== "empty") {
      previousContentRef.current = content;
      setCurrentContent(content);
    }
  }, [reinitialize, readContent, previousContentRef, setCurrentContent]);

  return (
    <>
      <ClipboardHeader
        isMonitoring={isMonitoring}
        onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
        hasHistory={history.length > 0}
        onClearAll={clearAll}
        systemInfo={systemInfo}
        historyLimit={historyLimit}
        onHistoryLimitChange={setHistoryLimit}
        filters={filters}
        onFiltersChange={setFilters}
        hotkeys={hotkeys}
        onSetHotkey={setHotkey}
        onResetHotkey={resetHotkey}
        onResetAllHotkeys={resetAllHotkeys}
      />

      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleRetry}
          onDismiss={dismissError}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {!isLoaded ? (
          <ClipboardItemSkeletonList />
        ) : (
          <ClipboardList
            items={filteredItems}
            currentContent={currentContent}
            onCopy={handleCopy}
            onPaste={onPaste}
            onDelete={deleteItem}
            onToggleFavorite={toggleFavorite}
            onReorder={reorderItems}
            onSplitEnv={splitEnvItem}
            onUpdateNote={updateNote}
            onToggleFavoriteFilter={toggleFavoriteFilter}
            onEditingNoteChange={setIsEditingNote}
            isEditingNote={isEditingNote}
            isSearching={isSearching}
            hasMore={hasMore && !isSearching}
            onLoadMore={loadMore}
            hotkeys={hotkeys}
            isActive={isActive}
          />
        )}
      </div>
    </>
  );
}
