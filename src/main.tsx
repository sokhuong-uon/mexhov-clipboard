import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "@/app";
import { tokenStore, useTokenStore } from "@/features/auth/stores/token-store";
import { authClient } from "@/features/auth/lib/better-auth-client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

useTokenStore.subscribe((state, prev) => {
  if (state.token !== prev.token) {
    void authClient.getSession();
  }
});

await tokenStore.hydrate();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
