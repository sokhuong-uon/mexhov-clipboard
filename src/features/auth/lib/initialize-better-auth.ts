import { isTauri } from "@tauri-apps/api/core"
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link"
import { handleAuthDeepLinkUrls } from "@/features/auth/lib/handle-auth-deep-link-urls"

export function initializeBetterAuth() {
  if (!isTauri()) return

  const handleAuthDeepLinkUrlsCallback = (urls?: string[] | null) => {
    handleAuthDeepLinkUrls({ urls })
  }

  if (!sessionStorage.getItem("isDeepLinkProcessed")) {
    getCurrent().then(handleAuthDeepLinkUrlsCallback)
    sessionStorage.setItem("isDeepLinkProcessed", "true")
  }

  const unlisten = onOpenUrl(handleAuthDeepLinkUrlsCallback)

  return () => unlisten.then((f) => f())
}
