import { useRef, useState } from "react";
import { commands } from "@/bindings";

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
    commands.convertColor(text, format).then((result) => {
      if (result.status === "ok") setPreview(result.data);
    });
  }

  return preview ? (
    <span className="font-mono text-xs text-muted-foreground truncate max-w-44">
      {preview}
    </span>
  ) : null;
}
