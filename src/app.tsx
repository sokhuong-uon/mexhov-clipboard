import "@/main.css";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useMemo, useState } from "react";

import { ErrorBanner } from "@/components/clipboard-error-banner";
import { ClipboardList } from "@/components/clipboard-list";
import { ClipboardHeader } from "@/components/clipboard-window-header";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useClipboard } from "@/hooks/use-clipboard";
import { useSystemTheme } from "@/hooks/use-system-theme";
import { useClipboardHistory } from "@/hooks/use-clipboard-history";
import { useClipboardMonitor } from "@/hooks/use-clipboard-monitor";
import { ClipboardContent, ClipboardItem } from "@/types/clipboard";

function App() {
  useSystemTheme();
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { readContent, write, writeImage, reinitialize, error, dismissError } =
    useClipboard();

  const {
    history,
    setCurrentContent,
    addContentToHistory,
    deleteItem,
    clearAll,
    toggleFavorite,
    reorderItems,
    splitEnvItem,
  } = useClipboardHistory();

  const { systemInfo, previousContentRef } = useClipboardMonitor({
    onClipboardChange: addContentToHistory,
    onCurrentContentUpdate: setCurrentContent,
    readContent,
    isMonitoring,
  });

  const handleCopy = useCallback(
    async (item: ClipboardItem) => {
      const wasMonitoring = isMonitoring;
      setIsMonitoring(false);

      try {
        if (item.content_type === "text" && item.text_content) {
          await write(item.text_content);
          const newContent: ClipboardContent = {
            type: "text",
            text: item.text_content,
          };
          previousContentRef.current = newContent;
          setCurrentContent(newContent);
        } else if (item.content_type === "image" && item.image_data) {
          await writeImage(item.image_data);
          const newContent: ClipboardContent = {
            type: "image",
            base64Data: item.image_data,
            width: item.image_width || 0,
            height: item.image_height || 0,
          };
          previousContentRef.current = newContent;
          setCurrentContent(newContent);
        }
      } finally {
        setTimeout(() => {
          if (wasMonitoring) {
            setIsMonitoring(true);
          }
        }, 200);
      }

      await invoke("hide_window");
    },
    [write, writeImage, isMonitoring, previousContentRef, setCurrentContent],
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
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {error && (
          <ErrorBanner
            error={error}
            onRetry={handleRetry}
            onDismiss={dismissError}
          />
        )}

        <div className="flex-1 overflow-y-auto">
          <ClipboardList
            items={filteredItems}
            onCopy={handleCopy}
            onDelete={deleteItem}
            onToggleFavorite={toggleFavorite}
            onReorder={reorderItems}
            onSplitEnv={splitEnvItem}
            isSearching={isSearching}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
