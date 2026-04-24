import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Film } from "lucide-react";
import { ClipboardItem } from "@/types/clipboard";
import { LinkPreview, isUrl } from "@/components/link-preview";
import { ClipboardItemColor } from "@/components/clipboard-item-color";
import { ClipboardItemFile } from "@/components/clipboard-item-file";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { useDraggableMedia } from "@/hooks/use-draggable-media";

const IMAGE_EXT = /\.(gif|webp|png|jpg|jpeg|svg)(\?.*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|mov)(\?.*)?$/i;

function getMediaType(url: string): "image" | "video" | null {
  try {
    const path = new URL(url).pathname;
    if (IMAGE_EXT.test(path)) return "image";
    if (VIDEO_EXT.test(path)) return "video";
  } catch {}
  return null;
}

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

const DraggableMedia = ({ url }: { url: string }) => {
  const { preload, handleDragStart } = useDraggableMedia(url);

  return (
    <div className="flex flex-col gap-1.5">
      <img
        src={url}
        alt="Media preview"
        loading="lazy"
        draggable={false}
        onMouseEnter={preload}
        onMouseDown={handleDragStart}
        className="max-w-full max-h-40 rounded-md object-contain bg-muted cursor-grab"
      />
    </div>
  );
};

function maskSecret(text: string): string {
  const reveal = text.length <= 10 ? 4 : 6;
  const visible = text.slice(0, reveal);
  const masked = "•".repeat(Math.max(text.length - reveal, 4));
  return visible + masked;
}

const SecretContent = ({ text }: { text: string }) => {
  const [revealed, setRevealed] = useState(false);
  const masked = useMemo(() => maskSecret(text), [text]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center">
        <button
          onClick={() => setRevealed((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-auto"
        >
          {revealed ? "Hide" : "Reveal"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap wrap-break-word text-card-foreground text-sm leading-relaxed font-[inherit] select-text">
        {revealed ? text : masked}
      </pre>
    </div>
  );
};

export const ClipboardItemContent = ({ item }: { item: ClipboardItem }) => {
  if (item.content_type === "image") {
    return (
      <div className="flex flex-col gap-2">
        {item.image_data && (
          <img
            src={`data:image/png;base64,${item.image_data}`}
            alt="Clipboard image"
            className="max-w-full max-h-80 rounded-md object-contain bg-muted"
          />
        )}
      </div>
    );
  }

  if (item.file_mime && item.text_content) {
    return (
      <ClipboardItemFile path={item.text_content} fileMime={item.file_mime} />
    );
  }

  if (item.is_secret && item.text_content) {
    return <SecretContent text={item.text_content} />;
  }

  if (item.detected_color) {
    return <ClipboardItemColor item={item} />;
  }

  if (isUrl(item.text_content || "")) {
    const mediaType = getMediaType(item.text_content!);

    if (mediaType === "image") {
      return <DraggableMedia url={item.text_content!} />;
    }

    if (mediaType === "video") {
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Film className="size-4" />
            <p className="text-sm truncate flex-1">{item.text_content}</p>
          </div>
          <video
            src={item.text_content!}
            muted
            loop
            autoPlay
            playsInline
            className="max-w-full max-h-40 rounded-md object-contain bg-muted"
          />
        </div>
      );
    }

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
