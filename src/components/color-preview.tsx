import { convertColor } from "@/utils/color";

export function ColorPreview({
  text,
  format,
}: {
  text: string;
  format: string;
}) {
  const preview = convertColor(text, format);

  return preview ? (
    <span className="font-mono text-xs text-muted-foreground truncate max-w-44">
      {preview}
    </span>
  ) : null;
}
