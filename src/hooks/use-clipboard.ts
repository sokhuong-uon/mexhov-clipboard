import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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
    try {
      const text = await invoke<string>("read_clipboard");
      return text || "";
    } catch (error) {
      const errorMessage = logError("Failed to read clipboard", error);

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
    }
  }, [logError]);

  const readImage = useCallback(async (): Promise<{
    base64Data: string;
    width: number;
    height: number;
  } | null> => {
    try {
      const result = await invoke<[string, number, number] | null>(
        "read_clipboard_image",
      );
      if (result) {
        const [base64Data, width, height] = result;
        return { base64Data, width, height };
      }
      return null;
    } catch (error) {
      const errorMessage = logError("Failed to read clipboard image", error);
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
    }
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

      try {
        await invoke("write_clipboard", { text });
        setError(null);
      } catch (rustError) {
        const errorMessage = logError("Rust clipboard write failed", rustError);
        setError({
          id: Date.now().toString(),
          message: `Failed to write to clipboard: ${errorMessage}`,
          timestamp: new Date(),
          retryable: true,
        });
        throw rustError;
      }
    },
    [logError],
  );

  const writeImage = useCallback(
    async (base64Data: string): Promise<void> => {
      try {
        await invoke("write_clipboard_image", { base64Data });
        setError(null);
      } catch (error) {
        const errorMessage = logError(
          "Failed to write image to clipboard",
          error,
        );
        setError({
          id: Date.now().toString(),
          message: `Failed to write image to clipboard: ${errorMessage}`,
          timestamp: new Date(),
          retryable: true,
        });
        throw error;
      }
    },
    [logError],
  );

  const reinitialize = useCallback(async (): Promise<void> => {
    try {
      await invoke("reinitialize_clipboard");
      setError(null);
    } catch (error) {
      const errorMessage = logError("Failed to reinitialize clipboard", error);
      setError({
        id: Date.now().toString(),
        message: `Failed to reinitialize: ${errorMessage}`,
        timestamp: new Date(),
        retryable: true,
      });
      throw error;
    }
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
