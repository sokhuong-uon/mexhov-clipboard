import "@/main.css";
import { useCallback, useState } from "react";
import { useDebouncedState } from "@tanstack/react-pacer";

import { ErrorBanner } from "@/components/clipboard-error-banner";
import { ClipboardList } from "@/components/clipboard-list";
import { ClipboardItemSkeletonList } from "@/components/clipboard-item-skeleton";
import { ClipboardHeader } from "@/components/clipboard-window-header";
import { GifView } from "@/components/gif-view";
import { SymbolsView } from "@/components/symbols-view";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { commands } from "@/bindings";
import { useClipboard } from "@/hooks/use-clipboard";
import { useSettings } from "@/hooks/use-settings";
import { useHotkeysConfig } from "@/hooks/use-hotkeys-config";
import { useSystemTheme } from "@/hooks/use-system-theme";
import { useClipboardHistory } from "@/hooks/use-clipboard-history";
import { useClipboardMonitor } from "@/hooks/use-clipboard-monitor";
import { useClipboardFilters } from "@/hooks/use-clipboard-filters";
import { ClipboardItem } from "@/types/clipboard";
import type { Klipy } from "@/features/klipy/schema/klipy";
import { Clipboard, TypeOutline } from "lucide-react";

function App() {
  useSystemTheme();
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [activeTab, setActiveTab] = useState<"clipboard" | "gif" | "symbols">(
    "clipboard",
  );
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useDebouncedState("", { wait: 150 });

  const { historyLimit, setHistoryLimit } = useSettings();
  const {
    hotkeys,
    setHotkey,
    resetHotkey,
    resetAll: resetAllHotkeys,
  } = useHotkeysConfig();
  const [isEditingNote, setIsEditingNote] = useState(false);

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
    updateNote,
  } = useClipboardHistory(historyLimit, false);

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
    const result = await commands.pasteItem(
      item.content_type,
      item.text_content ?? null,
      item.image_data ?? null,
    );
    if (result.status === "error") {
      console.error("[handlePaste] paste_item failed:", result.error);
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

  const { filters, setFilters, filteredItems, toggleFavoriteFilter } =
    useClipboardFilters(history, searchQuery);

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

  const handleGifPaste = useCallback(async (item: Klipy) => {
    const variant = item.file.hd ?? item.file.md ?? item.file.sm;
    const url = variant?.gif?.url ?? variant?.webp?.url;
    if (!url) return;

    const downloaded = await commands.downloadMediaToTemp(url);
    if (downloaded.status === "error") {
      console.error("[handleGifPaste] download failed:", downloaded.error);
      return;
    }
    const [filePath] = downloaded.data;

    const pasted = await commands.pasteFileUri(filePath);
    if (pasted.status === "error") {
      console.error("[handleGifPaste] paste_file_uri failed:", pasted.error);
    }
  }, []);

  const handleSymbolSelect = useCallback(
    async (char: string) => {
      await write(char);
    },
    [write],
  );

  const handleSymbolPaste = useCallback(async (char: string) => {
    const result = await commands.pasteItem("text", char, null);
    if (result.status === "error") {
      console.error("[handleSymbolPaste] paste_item failed:", result.error);
    }
  }, []);

  return (
    <TooltipProvider>
      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(v as "clipboard" | "gif" | "symbols")
        }
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
            <TabsTrigger value="symbols" className="rounded-2xl">
              <TypeOutline className="text-neutral-500 dark:text-neutral-400" />
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
            filters={filters}
            onFiltersChange={setFilters}
            hotkeys={hotkeys}
            onSetHotkey={setHotkey}
            onResetHotkey={resetHotkey}
            onResetAllHotkeys={resetAllHotkeys}
            isEditingNote={isEditingNote}
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
                onUpdateNote={updateNote}
                onToggleFavoriteFilter={toggleFavoriteFilter}
                onEditingNoteChange={setIsEditingNote}
                isEditingNote={isEditingNote}
                isSearching={isSearching}
                hasMore={hasMore && !isSearching}
                onLoadMore={loadMore}
                hotkeys={hotkeys}
                isActive={activeTab === "clipboard"}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="gif"
          keepMounted
          className="flex flex-col overflow-hidden min-h-0 data-hidden:hidden"
        >
          <GifView
            onSelect={handleGifSelect}
            onPaste={handleGifPaste}
            isActive={activeTab === "gif"}
          />
        </TabsContent>

        <TabsContent
          value="symbols"
          keepMounted
          className="flex flex-col overflow-hidden min-h-0 data-hidden:hidden"
        >
          <SymbolsView
            onSelect={handleSymbolSelect}
            onPaste={handleSymbolPaste}
            isActive={activeTab === "symbols"}
          />
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}

export default App;
