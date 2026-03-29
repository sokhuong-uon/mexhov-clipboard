import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, Copy, ExternalLink, Globe, QrCode, X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type LinkPreviewData = {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  site_name: string | null;
};

const URL_REGEX = /^https?:\/\/[^\s]+$/;

const previewCache = new Map<string, LinkPreviewData | null>();

export function isUrl(text: string): boolean {
  return URL_REGEX.test(text.trim());
}

export function LinkPreview({ url }: { url: string }) {
  const cached = previewCache.get(url);
  const [data, setData] = useState<LinkPreviewData | null>(cached ?? null);
  const [loading, setLoading] = useState(!previewCache.has(url));
  const [error, setError] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const copyQr = useCallback(async () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    await invoke("write_clipboard_image", { base64Data: base64 });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  useEffect(() => {
    if (previewCache.has(url)) {
      setData(previewCache.get(url)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    invoke<LinkPreviewData>("fetch_link_preview", { url })
      .then((result) => {
        previewCache.set(url, result);
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        previewCache.set(url, null);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground animate-pulse">
        <Globe className="size-3.5 shrink-0" />
        <span className="truncate">{url}</span>
      </div>
    );
  }

  if (error || !data || (!data.title && !data.description)) {
    return null;
  }

  if (showQr) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-border/50 bg-muted/30 p-3">
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] text-muted-foreground truncate flex-1">
            {data.site_name || new URL(url).hostname}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowQr(false)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="size-3" />
          </Button>
        </div>
        <div
          className="relative group/qr cursor-pointer rounded bg-white p-3"
          onClick={copyQr}
        >
          <QRCodeCanvas ref={qrRef} value={url} size={140} marginSize={1} />
          <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50 opacity-0 group-hover/qr:opacity-100 transition-opacity">
            {copied ? (
              <Check className="size-5 text-white" />
            ) : (
              <Copy className="size-5 text-white" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-2.5 rounded-md border border-border/50 bg-muted/30 p-2 overflow-hidden cursor-pointer hover:bg-muted/50 transition-all active:scale-[0.98] active:opacity-70"
      onClick={() => openUrl(url)}
      role="link"
    >
      {data.image && (
        <img
          src={data.image}
          alt=""
          className="rounded object-cover shrink-0 bg-muted aspect-video max-w-32"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {data.favicon ? (
            <img
              src={data.favicon}
              alt=""
              className="size-3 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).replaceWith(
                  Object.assign(document.createElement("span"), {
                    className: "size-3 shrink-0",
                  }),
                );
              }}
            />
          ) : (
            <Globe className="size-3 shrink-0" />
          )}
          <span className="truncate">
            {data.site_name || new URL(url).hostname}
          </span>
          <ExternalLink className="size-2.5 shrink-0 opacity-50" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowQr(true);
                  }}
                  className="text-muted-foreground hover:text-foreground ml-auto size-4"
                />
              }
            >
              <QrCode className="size-4" />
            </TooltipTrigger>
            <TooltipContent className="pointer-events-none">
              Show QR code
            </TooltipContent>
          </Tooltip>
        </div>
        {data.title && (
          <p className="text-xs font-medium text-card-foreground truncate leading-tight">
            {data.title}
          </p>
        )}
        {data.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
            {data.description}
          </p>
        )}
      </div>
    </div>
  );
}
