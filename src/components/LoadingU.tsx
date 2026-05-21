import { useEffect, useRef } from "react";
// Import raw SVG markup
// eslint-disable-next-line import/no-unresolved
import mandelaSvgUrl from "@/assets/mandela-traced.svg?raw";

export function LoadingU() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const paths = el.querySelectorAll("path");
    paths.forEach((p) => {
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", "currentColor");
      p.setAttribute("stroke-width", "18");
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-linejoin", "round");
      p.setAttribute("pathLength", "1");
    });
    const svg = el.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", "160");
      svg.setAttribute("height", "200");
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div
        ref={containerRef}
        className="loading-mandela-draw text-secondary"
        dangerouslySetInnerHTML={{ __html: mandelaSvgUrl as unknown as string }}
      />
      <div className="text-sm text-muted-foreground">A carregar…</div>
    </div>
  );
}
