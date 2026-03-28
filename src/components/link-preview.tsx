import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ExternalLink, Globe } from "lucide-react";

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

  return (
    <div className="flex gap-2.5 rounded-md border border-border/50 bg-muted/30 p-2 overflow-hidden">
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
