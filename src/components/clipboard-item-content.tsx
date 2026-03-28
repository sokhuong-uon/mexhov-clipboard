import { Image } from "lucide-react";
import { ClipboardItem } from "@/types/clipboard";
import { truncateText } from "@/utils/formatting";
import { LinkPreview, isUrl } from "@/components/link-preview";

export const ClipboardItemContent = ({ item }: { item: ClipboardItem }) => {
  if (item.content_type === "image") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Image className="size-4" />
          <span className="text-sm">
            Image ({item.image_width}x{item.image_height})
          </span>
        </div>
        {item.image_data && (
          <img
            src={`data:image/png;base64,${item.image_data}`}
            alt="Clipboard image"
            className="max-w-full max-h-32 rounded-md object-contain bg-muted"
            style={{ maxWidth: Math.min(item.image_width || 200, 200) }}
          />
        )}
      </div>
    );
  }

  if (isUrl(item.text_content || "")) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="wrap-break-word text-card-foreground text-sm leading-relaxed truncate">
          {item.text_content}
        </p>
        <LinkPreview url={item.text_content!} />
      </div>
    );
  }

  return (
    <p className="wrap-break-word text-card-foreground text-sm leading-relaxed">
      {truncateText(item.text_content || "")}
    </p>
  );
};
