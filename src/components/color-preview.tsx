import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export function ColorPreview({
  text,
  format,
}: {
  text: string;
  format: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const fetched = useRef(false);

  if (!fetched.current) {
    fetched.current = true;
    invoke<string>("convert_color", { text, format }).then(setPreview);
  }

  return preview ? (
    <span className="font-mono text-xs text-muted-foreground truncate max-w-44">
      {preview}
    </span>
  ) : null;
}
