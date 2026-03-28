import "@/main.css";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useMemo, useState } from "react";
import { useDebouncedState } from "@tanstack/react-pacer";

import { ErrorBanner } from "@/components/clipboard-error-banner";
import { ClipboardList } from "@/components/clipboard-list";
import { ClipboardItemSkeletonList } from "@/components/clipboard-item-skeleton";
import { ClipboardHeader } from "@/components/clipboard-window-header";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useClipboard } from "@/hooks/use-clipboard";
import { useSettings } from "@/hooks/use-settings";
import { useSystemTheme } from "@/hooks/use-system-theme";
import { useClipboardHistory } from "@/hooks/use-clipboard-history";
import { useClipboardMonitor } from "@/hooks/use-clipboard-monitor";
import { ClipboardItem } from "@/types/clipboard";

function App() {
  useSystemTheme();
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useDebouncedState("", { wait: 150 });

  const { historyLimit, setHistoryLimit } = useSettings();

  const { readContent, write, writeImage, reinitialize, error, dismissError } =
    useClipboard();

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
  } = useClipboardHistory(historyLimit);

  const { systemInfo, previousContentRef } = useClipboardMonitor({
    onClipboardChange: addContentToHistory,
    onCurrentContentUpdate: setCurrentContent,
    readContent,
    isMonitoring,
  });

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

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter((item) => {
      if (item.content_type === "text" && item.text_content) {
        return item.text_content.toLowerCase().includes(q);
      }
      if (item.content_type === "image") {
        return "image".includes(q);
      }
      return false;
    });
  }, [history, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background text-foreground">
        <ClipboardHeader
          isMonitoring={isMonitoring}
          onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
          hasHistory={history.length > 0}
          onClearAll={clearAll}
          systemInfo={systemInfo}
          searchQuery={searchInput}
          onSearchChange={(q) => {
            setSearchInput(q);
            setSearchQuery(q);
          }}
          historyLimit={historyLimit}
          onHistoryLimitChange={setHistoryLimit}
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
              onDelete={deleteItem}
              onToggleFavorite={toggleFavorite}
              onReorder={reorderItems}
              onSplitEnv={splitEnvItem}
              isSearching={isSearching}
              hasMore={hasMore && !isSearching}
              onLoadMore={loadMore}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
