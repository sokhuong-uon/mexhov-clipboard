import { useCallback, useState } from "react";
import { commands } from "@/bindings";
import { ClipboardError, ClipboardContent } from "@/types/clipboard";

export const useClipboard = () => {
  const [error, setError] = useState<ClipboardError | null>(null);

  const logError = useCallback((context: string, error: unknown): string => {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${timestamp}] ${context}:`, error);
    return errorMessage;
  }, []);

  const read = useCallback(async (): Promise<string> => {
    const result = await commands.readClipboard();
    if (result.status === "ok") {
      return result.data || "";
    }

    const errorMessage = logError("Failed to read clipboard", result.error);

    // Only show error for persistent failures
    if (
      !errorMessage.includes("No selection") &&
      !errorMessage.includes("Nothing is copied")
    ) {
      setError({
        id: Date.now().toString(),
        message: `Clipboard read failed: ${errorMessage}`,
        timestamp: new Date(),
        retryable: true,
      });
    }
    return "";
  }, [logError]);

  const readImage = useCallback(async (): Promise<{
    base64Data: string;
    width: number;
    height: number;
  } | null> => {
    const result = await commands.readClipboardImage();
    if (result.status === "ok") {
      if (result.data) {
        const [base64Data, width, height] = result.data;
        return { base64Data, width, height };
      }
      return null;
    }

    const errorMessage = logError("Failed to read clipboard image", result.error);
    // Don't show error for no image available
    if (
      !errorMessage.includes("No selection") &&
      !errorMessage.includes("ContentNotAvailable") &&
      !errorMessage.includes("Nothing is copied")
    ) {
      setError({
        id: Date.now().toString(),
        message: `Clipboard image read failed: ${errorMessage}`,
        timestamp: new Date(),
        retryable: true,
      });
    }
    return null;
  }, [logError]);

  // Read clipboard content (text or image)
  const readContent = useCallback(async (): Promise<ClipboardContent> => {
    // Try image first (higher priority) — Rust-side cache avoids
    // re-encoding when the image hasn't changed between polls.
    try {
      const imageResult = await readImage();
      if (imageResult) {
        return {
          type: "image",
          base64Data: imageResult.base64Data,
          width: imageResult.width,
          height: imageResult.height,
        };
      }
    } catch {
      // Image read failed, try text
    }

    const text = await read();
    if (text) {
      return { type: "text", text };
    }

    return { type: "empty" };
  }, [read, readImage]);

  const write = useCallback(
    async (text: string): Promise<void> => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          setError(null);
          return;
        }
      } catch (error) {
        logError("Browser clipboard API failed", error);
      }

      const result = await commands.writeClipboard(text);
      if (result.status === "ok") {
        setError(null);
        return;
      }

      const errorMessage = logError("Rust clipboard write failed", result.error);
      setError({
        id: Date.now().toString(),
        message: `Failed to write to clipboard: ${errorMessage}`,
        timestamp: new Date(),
        retryable: true,
      });
      throw result.error;
    },
    [logError],
  );

  const writeImage = useCallback(
    async (base64Data: string): Promise<void> => {
      const result = await commands.writeClipboardImage(base64Data);
      if (result.status === "ok") {
        setError(null);
        return;
      }

      const errorMessage = logError(
        "Failed to write image to clipboard",
        result.error,
      );
      setError({
        id: Date.now().toString(),
        message: `Failed to write image to clipboard: ${errorMessage}`,
        timestamp: new Date(),
        retryable: true,
      });
      throw result.error;
    },
    [logError],
  );

  const reinitialize = useCallback(async (): Promise<void> => {
    const result = await commands.reinitializeClipboard();
    if (result.status === "ok") {
      setError(null);
      return;
    }

    const errorMessage = logError("Failed to reinitialize clipboard", result.error);
    setError({
      id: Date.now().toString(),
      message: `Failed to reinitialize: ${errorMessage}`,
      timestamp: new Date(),
      retryable: true,
    });
    throw result.error;
  }, [logError]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
    read,
    readImage,
    readContent,
    write,
    writeImage,
    reinitialize,
    error,
    dismissError,
  };
};
