import { useEffect, useState, type RefObject } from "react";

export type ScrollViewport = {
  width: number;
  height: number;
  scrollTop: number;
};

const INITIAL_VIEWPORT: ScrollViewport = { width: 0, height: 0, scrollTop: 0 };

/**
 * Tracks an element's content size and scroll position. Updates are
 * coalesced into a single animation frame so scroll/resize storms don't
 * trigger one React render per pixel.
 *
 * @param horizontalPadding subtracted from measured width (e.g. inner padding)
 */
export function useScrollViewport<T extends HTMLElement>(
  scrollElementRef: RefObject<T | null>,
  horizontalPadding = 0,
): ScrollViewport {
  const [viewport, setViewport] = useState<ScrollViewport>(INITIAL_VIEWPORT);

  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    let measuredWidth = Math.max(0, scrollElement.clientWidth - horizontalPadding);
    let measuredHeight = scrollElement.clientHeight;
    let measuredScrollTop = scrollElement.scrollTop;
    let pendingFrameId: number | null = null;
    let lastEmitted: ScrollViewport = INITIAL_VIEWPORT;

    const commitMeasurement = () => {
      pendingFrameId = null;
      if (
        measuredWidth === lastEmitted.width &&
        measuredHeight === lastEmitted.height &&
        measuredScrollTop === lastEmitted.scrollTop
      ) {
        return;
      }
      lastEmitted = {
        width: measuredWidth,
        height: measuredHeight,
        scrollTop: measuredScrollTop,
      };
      setViewport(lastEmitted);
    };

    const scheduleCommit = () => {
      if (pendingFrameId !== null) return;
      pendingFrameId = requestAnimationFrame(commitMeasurement);
    };

    // Seed initial measurement synchronously.
    lastEmitted = {
      width: measuredWidth,
      height: measuredHeight,
      scrollTop: measuredScrollTop,
    };
    setViewport(lastEmitted);

    const resizeObserver = new ResizeObserver((entries) => {
      const contentRect = entries[0]?.contentRect;
      if (!contentRect) return;
      measuredWidth = Math.max(0, contentRect.width - horizontalPadding);
      measuredHeight = contentRect.height;
      scheduleCommit();
    });
    resizeObserver.observe(scrollElement);

    const handleScroll = () => {
      measuredScrollTop = scrollElement.scrollTop;
      scheduleCommit();
    };
    scrollElement.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      scrollElement.removeEventListener("scroll", handleScroll);
      if (pendingFrameId !== null) cancelAnimationFrame(pendingFrameId);
    };
  }, [scrollElementRef, horizontalPadding]);

  return viewport;
}
