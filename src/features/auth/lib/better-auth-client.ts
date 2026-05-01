import { isTauri } from "@tauri-apps/api/core"
import { fetch as tauriFetch } from "@tauri-apps/plugin-http"
import { platform } from "@tauri-apps/plugin-os"
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_BASE_URL,
  fetchOptions: {
    customFetchImpl: (...params) =>
      isTauri() && platform() === "macos" && window.location.protocol === "tauri:"
        ? tauriFetch(...params)
        : fetch(...params)
  }
});
