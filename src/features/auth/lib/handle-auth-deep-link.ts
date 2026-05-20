import { authClient } from "@/features/auth/lib/better-auth-client";

export async function handleAuthDeepLink({
  urlString,
}: { urlString: string }) {
  const basePath = "/api/auth/"
  const scheme = import.meta.env.VITE_TAURI_APP_SCHEME

  const url = new URL(urlString)
  const isHttpUrl = url.protocol === "https:" || url.protocol === "http:"

  const isAuthDeepLink = urlString.startsWith(`${scheme}:/${basePath}`)
  const isAuthHttpUrl = isHttpUrl && url.pathname.startsWith(basePath)

  if (!isAuthDeepLink && !isAuthHttpUrl) return false

  const relativePath = isHttpUrl
    ? `/${urlString.replace(url.origin, "").replace(basePath, "")}`
    : `/${urlString.replace(`${scheme}:/${basePath}`, "")}`

  await authClient.$fetch(relativePath)
  return true
}
