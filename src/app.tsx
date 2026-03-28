import "@/main.css";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";

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

  const { readContent, write, writeImage, reinitialize, error, dismissError } =
    useClipboard();

  const {
    history,
    setCurrentContent,
    addContentToHistory,
    deleteItem,
    clearAll,
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
        if (item.type === "text" && item.text) {
          await write(item.text);
          const newContent: ClipboardContent = {
            type: "text",
            text: item.text,
          };
          previousContentRef.current = newContent;
          setCurrentContent(newContent);
        } else if (item.type === "image" && item.imageData) {
          await writeImage(item.imageData);
          const newContent: ClipboardContent = {
            type: "image",
            base64Data: item.imageData,
            width: item.imageWidth || 0,
            height: item.imageHeight || 0,
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

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background text-foreground">
        <ClipboardHeader
          isMonitoring={isMonitoring}
          onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
          hasHistory={history.length > 0}
          onClearAll={clearAll}
          systemInfo={systemInfo}
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
            items={history}
            onCopy={handleCopy}
            onDelete={deleteItem}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
