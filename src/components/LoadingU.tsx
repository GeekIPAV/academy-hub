import { useEffect, useRef } from "react";
// eslint-disable-next-line import/no-unresolved
import mandelaSvgRaw from "@/assets/mandela-traced.svg?raw";

// Pre-process the raw SVG once so that even the very first paint (SSR included)
// already has pathLength="1" on every <path>, the right viewBox sizing and no
// inline width/height that could blow it up to its natural size.
const processedSvg = (mandelaSvgRaw as unknown as string)
  // strip any hard-coded width/height on the root <svg> so CSS controls size
  .replace(/<svg([^>]*?)\swidth="[^"]*"/i, "<svg$1")
  .replace(/<svg([^>]*?)\sheight="[^"]*"/i, "<svg$1")
  // ensure every path has pathLength="1" for the stroke-dash animation
  .replace(/<path\b(?![^>]*\bpathLength=)/gi, '<path pathLength="1"');

export function LoadingU() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Safety net: if the raw SVG ever ships a <path> the regex didn't catch,
  // make sure pathLength is set so the animation works.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.querySelectorAll("path").forEach((p) => {
      if (!p.getAttribute("pathLength")) p.setAttribute("pathLength", "1");
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div
        ref={containerRef}
        className="loading-mandela-draw text-secondary"
        dangerouslySetInnerHTML={{ __html: processedSvg }}
      />
      <div className="text-sm text-muted-foreground">A carregar…</div>
    </div>
  );
}
