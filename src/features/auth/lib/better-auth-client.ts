import { fetch as tauriFetch } from "@tauri-apps/plugin-http"
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins"
import { tokenStore } from "@/features/auth/stores/token-store"

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_BASE_URL,
  plugins: [magicLinkClient()],

  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => tokenStore.get() ?? "",
    },

    customFetchImpl: async (input, init) => {
      const res = await tauriFetch(input, { ...init, maxRedirections: 0 })

      const newToken = res.headers.get("set-auth-token")
      if (newToken) await tokenStore.set(newToken)

      return res
    },
  },
});
