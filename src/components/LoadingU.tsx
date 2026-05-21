import { useEffect, useRef } from "react";
// eslint-disable-next-line import/no-unresolved
import mandelaSvgRaw from "@/assets/mandela-traced.svg?raw";

// Pre-process the raw SVG once so that even the very first paint (SSR included)
// already has pathLength="1" on every <path>, the right viewBox sizing and no
// inline width/height that could blow it up to its natural size.
const processedSvg = (mandelaSvgRaw as unknown as string)
  .replace(/<svg([^>]*?)\swidth="[^"]*"/i, "<svg$1")
  .replace(/<svg([^>]*?)\sheight="[^"]*"/i, "<svg$1")
  .replace(/<path\b(?![^>]*\bpathLength=)/gi, '<path pathLength="1"');

export function MandelaMark() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.querySelectorAll("path").forEach((p) => {
      if (!p.getAttribute("pathLength")) p.setAttribute("pathLength", "1");
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="loading-mandela-draw text-secondary"
      dangerouslySetInnerHTML={{ __html: processedSvg }}
    />
  );
}

export function LoadingU() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <MandelaMark />
      <div className="text-sm text-muted-foreground">A carregar…</div>
    </div>
  );
}

export function LoadingUInline() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-6">
      <MandelaMark />
      <div className="text-sm text-muted-foreground">A carregar…</div>
    </div>
  );
}
