import "@/main.css";
import { useCallback, useState } from "react";
import { Clipboard, TypeOutline } from "lucide-react";

import { ClipboardTab } from "@/components/clipboard-tab";
import { GifView } from "@/components/gif-view";
import { SymbolsView } from "@/components/symbols-view";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useClipboard } from "@/hooks/use-clipboard";
import { useSystemTheme } from "@/hooks/use-system-theme";
import { usePasteActions } from "@/hooks/use-paste-actions";
import type { Klipy } from "@/features/klipy/schema/klipy";
import { getKlipyPasteUrl } from "@/features/klipy/klipy-url";

type TabValue = "clipboard" | "gif" | "symbols";

function App() {
  useSystemTheme();
  const [activeTab, setActiveTab] = useState<TabValue>("clipboard");
  const clipboard = useClipboard();
  const { pasteClipboardItem, pasteText, pasteKlipy } = usePasteActions();

  const handleGifSelect = useCallback(
    async (item: Klipy) => {
      const url = getKlipyPasteUrl(item);
      if (url) await clipboard.write(url);
    },
    [clipboard.write],
  );

  return (
    <TooltipProvider>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
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
              value="gif"
              className="text-neutral-500 dark:text-neutral-400 rounded-2xl"
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
          <ClipboardTab
            clipboard={clipboard}
            onPaste={pasteClipboardItem}
            isActive={activeTab === "clipboard"}
          />
        </TabsContent>

        <TabsContent
          value="gif"
          keepMounted
          className="flex flex-col overflow-hidden min-h-0 data-hidden:hidden"
        >
          <GifView
            onSelect={handleGifSelect}
            onPaste={pasteKlipy}
            isActive={activeTab === "gif"}
          />
        </TabsContent>

        <TabsContent
          value="symbols"
          keepMounted
          className="flex flex-col overflow-hidden min-h-0 data-hidden:hidden"
        >
          <SymbolsView
            onSelect={clipboard.write}
            onPaste={pasteText}
            isActive={activeTab === "symbols"}
          />
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}

export default App;
