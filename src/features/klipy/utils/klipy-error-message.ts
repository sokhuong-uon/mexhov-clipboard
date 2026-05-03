import { KlipyError, type KlipyErrorKind } from "@/features/klipy/utils/klipy-client";

const MESSAGES: Partial<Record<KlipyErrorKind, string>> = {
  missing_api_key: "KLIPY API key is missing.",
  invalid_api_key: "KLIPY rejected the API key. Check your settings.",
  rate_limited: "Too many requests — try again in a moment.",
  network: "Network unavailable. Check your connection.",
  api: "KLIPY service is having trouble. Try again later.",
};

const FALLBACK = "Failed to load GIFs.";

export function getKlipyErrorMessage(error: unknown): string {
  if (error instanceof KlipyError) {
    return MESSAGES[error.kind] ?? FALLBACK;
  }
  return FALLBACK;
}
