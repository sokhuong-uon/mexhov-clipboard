import axios, { AxiosError } from "axios";

const API_KEY = import.meta.env.VITE_KLIPY_API_KEY;

export type KlipyErrorKind =
  | "missing_api_key"
  | "invalid_api_key"
  | "rate_limited"
  | "network"
  | "api"
  | "unknown";

export class KlipyError extends Error {
  constructor(
    public kind: KlipyErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "KlipyError";
  }
}

export async function klipyGet<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  if (!API_KEY) {
    throw new KlipyError("missing_api_key", "VITE_KLIPY_API_KEY is not set");
  }

  try {
    const { data } = await axios.get<T>(path, {
      baseURL: `${import.meta.env.VITE_KLIPY_API_BASE_URL}/${API_KEY}`,
      params,
    });

    return data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status;

      if (status === 401 || status === 403) {
        throw new KlipyError("invalid_api_key", "API key was rejected");
      }

      if (status === 429) {
        throw new KlipyError("rate_limited", "Too many requests");
      }

      if (!error.response) {
        throw new KlipyError("network", "Network request failed");
      }
      throw new KlipyError("api", `KLIPY returned ${status}`);
    }
    throw new KlipyError("unknown", String(error));
  }
}
