import { ClipboardItem } from "@/types/clipboard";

export const ClipboardItemColor = ({
  item,
}: {
  item: ClipboardItem;
}) => {
  const color = item.detected_color!;
  const original = item.text_content || "";
  const isHex = original.trim().startsWith("#");
  const showHex = !isHex;

  return (
    <div className="flex items-stretch gap-3">
      <div
        className="w-10 shrink-0 rounded-lg border border-white/10 shadow-[0_0_12px_var(--swatch-color)]"
        style={
          {
            backgroundColor: color,
            "--swatch-color": color,
          } as React.CSSProperties
        }
      />
      <div className="flex flex-col justify-center gap-0.5 min-w-0">
        <span className="font-mono text-sm text-card-foreground truncate">
          {original}
        </span>
        {showHex && (
          <span className="font-mono text-[11px] text-muted-foreground">
            {color}
          </span>
        )}
      </div>
    </div>
  );
};
