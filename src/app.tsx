import "@/main.css";
import { useCallback, useMemo, useState } from "react";
import { useDebouncedState } from "@tanstack/react-pacer";

import { ErrorBanner } from "@/components/clipboard-error-banner";
import { ClipboardList } from "@/components/clipboard-list";
import { ClipboardItemSkeletonList } from "@/components/clipboard-item-skeleton";
import { ClipboardHeader } from "@/components/clipboard-window-header";
import { GifView } from "@/components/gif-view";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { invoke } from "@tauri-apps/api/core";
import { useClipboard } from "@/hooks/use-clipboard";
import { useSettings } from "@/hooks/use-settings";
import { useHotkeysConfig } from "@/hooks/use-hotkeys-config";
import { useSystemTheme } from "@/hooks/use-system-theme";
import { useClipboardHistory } from "@/hooks/use-clipboard-history";
import { useClipboardMonitor } from "@/hooks/use-clipboard-monitor";
import { ClipboardItem } from "@/types/clipboard";
import type { Klipy } from "@/features/klipy/schema/klipy";
import { Clipboard } from "lucide-react";

function App() {
  useSystemTheme();
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useDebouncedState("", { wait: 150 });

  const { historyLimit, setHistoryLimit } = useSettings();
  const { hotkeys, setHotkey, resetHotkey, resetAll: resetAllHotkeys } =
    useHotkeysConfig();
  const [favoritesFirst, setFavoritesFirst] = useState(false);

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
  } = useClipboardHistory(historyLimit, favoritesFirst);

  const { systemInfo, previousContentRef } = useClipboardMonitor({
    onClipboardChange: addContentToHistory,
    onCurrentContentUpdate: setCurrentContent,
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

  const handlePaste = useCallback(async (item: ClipboardItem) => {
    console.log("[handlePaste] called", { content_type: item.content_type, has_text: !!item.text_content, has_image: !!item.image_data });
    try {
      await invoke("paste_item", {
        contentType: item.content_type,
        textContent: item.text_content ?? null,
        imageData: item.image_data ?? null,
      });
      console.log("[handlePaste] success");
    } catch (e) {
      console.error("[handlePaste] paste_item failed:", e);
    }
  }, []);

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

  const handleGifSelect = useCallback(
    async (item: Klipy) => {
      const variant = item.file.hd ?? item.file.md ?? item.file.sm;
      const url = variant?.gif?.url ?? variant?.webp?.url;
      if (url) {
        await write(url);
      }
    },
    [write],
  );

  return (
    <TooltipProvider>
      <Tabs
        defaultValue="clipboard"
        className="h-full overflow-hidden bg-background text-foreground"
      >
        <div
          data-tauri-drag-region
          className="flex items-center gap-2 px-4 pt-3 pb-1 select-none"
        >
          <div data-tauri-drag-region className="select-none text-muted">
            Mexhov
          </div>
          <TabsList className="ml-auto">
            <TabsTrigger value="clipboard" className="rounded-2xl">
              <Clipboard className="text-neutral-500 dark:text-neutral-400" />
            </TabsTrigger>
            <TabsTrigger
              className="text-neutral-500 dark:text-neutral-400 rounded-2xl"
              value="gif"
            >
              GIF
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="clipboard"
          keepMounted
          className="flex flex-col overflow-hidden min-h-0 data-hidden:hidden"
        >
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
            favoritesFirst={favoritesFirst}
            onToggleFavoritesFirst={() => setFavoritesFirst((v) => !v)}
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
                onPaste={handlePaste}
                onDelete={deleteItem}
                onToggleFavorite={toggleFavorite}
                onReorder={reorderItems}
                onSplitEnv={splitEnvItem}
                onToggleFavoritesFirst={() => setFavoritesFirst((v) => !v)}
                isSearching={isSearching}
                hasMore={hasMore && !isSearching}
                onLoadMore={loadMore}
                hotkeys={hotkeys}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="gif"
          keepMounted
          className="flex flex-col overflow-hidden min-h-0 data-hidden:hidden"
        >
          <GifView onSelect={handleGifSelect} />
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}

export default App;
