import "@/main.css";
import { useCallback, useEffect, useState } from "react";
import { Copy, ImagePlay, SquarePercent } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useHotkey } from "@tanstack/react-hotkeys";

import { ClipboardTab } from "@/components/clipboard-tab";
import { GifView } from "@/components/gif-view";
import { SymbolsView } from "@/components/symbols-view";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useClipboard } from "@/hooks/use-clipboard";
import { useSystemTheme } from "@/hooks/use-system-theme";
import { usePasteActions } from "@/hooks/use-paste-actions";
import { useHotkeysConfig } from "@/features/hotkey/hooks/use-hotkeys-config";
import type { Klipy } from "@/features/klipy/schema/klipy";
import { getKlipyPasteUrl } from "@/features/klipy/klipy-url";
import { useBetterAuthTauri } from "@/features/auth/better-auth-tauri/hooks/use-better-auth-tauri";
import { authClient } from "@/features/auth/lib/better-auth-client";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

type TabValue = "clipboard" | "gif" | "symbols";

const TAB_ORDER: readonly TabValue[] = ["clipboard", "gif", "symbols"];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

import { tokenStore } from "@/features/auth/stores/token-store";

function App() {
  useSystemTheme();
  const [activeTab, setActiveTab] = useState<TabValue>("clipboard");
  const { hotkeys } = useHotkeysConfig();
  console.log("token: ", tokenStore.get());

  useEffect(() => {
    const unlisten = onOpenUrl((urls) => {
      console.log("DEEP LINK ARRIVED:", urls);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useBetterAuthTauri({
    authClient: authClient,
    scheme: "mexboard",
    debugLogs: true,
    onRequest: (href) => {
      console.log("Auth request:", href);
    },
    onSuccess: (callbackURL) => {
      console.log("Auth successful", callbackURL);
      // Navigate or update UI as needed
    },
    onError: (error) => {
      console.error("Auth error:", error);
      // Show error notification
    },
  });

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

        <div
          data-tauri-drag-region
          className="flex items-center gap-2 px-3 pb-3 select-none"
        >
          <TabsList className="bg-transparent">
            <TabsTrigger value="clipboard">
              <Copy />
            </TabsTrigger>

            <TabsTrigger value="gif">
              <ImagePlay />
            </TabsTrigger>

            <TabsTrigger value="symbols">
              <SquarePercent />
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </TooltipProvider>
  );
}

export default App;
