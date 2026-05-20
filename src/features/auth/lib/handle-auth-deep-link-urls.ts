import { handleAuthDeepLink } from "@/features/auth/lib/handle-auth-deep-link"

type HandleDeepLinkUrlsOptions = {
  urls?: string[] | null
}

export function handleAuthDeepLinkUrls({ urls, ...options}: HandleDeepLinkUrlsOptions) {

  if (!urls?.length) return

  handleAuthDeepLink({
    urlString: urls[0],
    ...options
  })
}
