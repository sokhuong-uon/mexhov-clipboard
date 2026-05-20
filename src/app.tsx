import "@/main.css";
import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useHotkey } from "@tanstack/react-hotkeys";

import { ClipboardTab } from "@/components/clipboard-tab";
import { GifView } from "@/features/klipy/components/gif-view";
import { SymbolsView } from "@/components/symbols-view";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useClipboard } from "@/hooks/use-clipboard";
import { useSystemTheme } from "@/hooks/use-system-theme";
import { usePasteActions } from "@/hooks/use-paste-actions";
import { useHotkeysConfig } from "@/features/hotkey/hooks/use-hotkeys-config";
import { useBetterAuth } from "@/features/auth/hooks/use-better-auth";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

type TabValue = "clipboard" | "gif" | "symbols";

const TAB_ORDER: readonly TabValue[] = ["clipboard", "gif", "symbols"];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

import { useTabs } from "@/features/tab/hooks/use-tabs";

function App() {
  useSystemTheme();
  const [activeTab, setActiveTab] = useState<TabValue>("clipboard");
  const { hotkeys } = useHotkeysConfig();
  const tabs = useTabs();

  useEffect(() => {
    const unlisten = onOpenUrl((urls) => {
      console.log("DEEP LINK ARRIVED:", urls);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useBetterAuth();

  useHotkey(
    hotkeys.cycleTabs,
    () => {
      setActiveTab((prev) => {
        const idx = TAB_ORDER.indexOf(prev);
        return TAB_ORDER[(idx + 1) % TAB_ORDER.length];
      });
    },
    { ignoreInputs: true },
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (isEditableTarget(e.target)) return;
      void getCurrentWindow().hide();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      e.preventDefault();
    };
    window.addEventListener("contextmenu", handler);
    return () => window.removeEventListener("contextmenu", handler);
  }, []);

  const clipboard = useClipboard();
  const { pasteClipboardItem, pasteText, pasteKlipy } = usePasteActions();

  return (
    <TooltipProvider>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        className="h-full overflow-hidden bg-background text-foreground pt-3"
      >
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
          <GifView onPaste={pasteKlipy} isActive={activeTab === "gif"} />
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

        <div
          data-tauri-drag-region
          className="flex items-center gap-2 px-3 pb-3 select-none"
        >
          <TabsList className="bg-transparent">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                <tab.icon />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </TooltipProvider>
  );
}

export default App;
