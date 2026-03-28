import { useState, useRef, useEffect } from "react";
import { Image, ChevronDown } from "lucide-react";
import { ClipboardItem } from "@/types/clipboard";
import { LinkPreview, isUrl } from "@/components/link-preview";
import { ClipboardItemColor } from "@/components/clipboard-item-color";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

const CollapsibleText = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = preRef.current;
    if (el) {
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, [text]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <pre
        ref={preRef}
        className={`whitespace-pre-wrap wrap-break-word text-card-foreground text-sm leading-relaxed font-[inherit] ${
          !isOpen ? "line-clamp-6" : ""
        }`}
      >
        {text}
      </pre>
      {isClamped && (
        <CollapsibleTrigger className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer mt-0.5">
          <ChevronDown
            className={`size-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
          {isOpen ? "Show less" : "Show more"}
        </CollapsibleTrigger>
      )}
      <CollapsibleContent />
    </Collapsible>
  );
};

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

  if (item.detected_color) {
    return <ClipboardItemColor item={item} />;
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

  return <CollapsibleText text={item.text_content || ""} />;
};
