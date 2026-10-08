import { useEffect, useRef } from "react";

export function parseVimeoId(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (/^\d+$/.test(s)) return s;
  const m = s.match(/vimeo\.com\/(?:.*?\/)?(?:video\/)?(\d+)/);
  return m?.[1] ?? null;
}

interface Props {
  video: string;
  startAt?: number;
  onProgress: (pct: number, seconds: number) => void;
  onEnded?: () => void;
}

/** Leitor Vimeo com registo de % visto (reporta a cada ~5% ou 10 s). */
export function VimeoPlayer({ video, startAt = 0, onProgress, onEnded }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const endedCb = useRef(onEnded);
  endedCb.current = onEnded;

  useEffect(() => {
    const id = parseVimeoId(video);
    if (!ref.current || !id) return;
    let destroyed = false;
    let player: { destroy: () => Promise<void> } | null = null;
    let lastPct = 0;
    let lastSent = 0;
    let maxPct = 0;
    let lastSec = 0;

    // Bloqueia avançar além do ponto já visto; recuar continua livre. Após ver até ao fim, fica livre.
    let maxSeen = startAt;
    let livre = false;
    let corrigindo = false;
    import("@vimeo/player").then(({ default: Player }) => {
      if (destroyed || !ref.current) return;
      const p = new Player(ref.current, { id: Number(id), responsive: true, dnt: true });
      player = p;
      p.ready().then(() => {
        if (startAt > 5) p.setCurrentTime(startAt).catch(() => {});
      });
      p.on("timeupdate", (d: { percent: number; seconds: number }) => {
        if (!corrigindo && d.seconds - maxSeen < 2) maxSeen = Math.max(maxSeen, d.seconds);
        const pct = Math.round(d.percent * 100);
        if (pct >= 99) livre = true;
        maxPct = Math.max(maxPct, pct);
        lastSec = d.seconds;
        const now = Date.now();
        if (maxPct - lastPct >= 5 || now - lastSent > 10_000) {
          lastPct = maxPct;
          lastSent = now;
          cb.current(maxPct, d.seconds);
        }
      });
      p.on("seeked", (d: { seconds: number }) => {
        if (livre || corrigindo || d.seconds <= maxSeen + 1) return;
        corrigindo = true;
        p.setCurrentTime(maxSeen).catch(() => {}).finally(() => { corrigindo = false; });
        import("sonner").then(({ toast }) => toast.info("Não é possível avançar o vídeo antes de o ver."));
      });
      p.on("ended", () => {
        livre = true;
        cb.current(100, lastSec);
        endedCb.current?.();
      });
      p.on("pause", () => cb.current(maxPct, lastSec));
    });
    return () => {
      destroyed = true;
      player?.destroy().catch(() => {});
    };
  }, [video, startAt]);

  if (!parseVimeoId(video)) {
    return <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Vídeo não configurado.</p>;
  }
  return <div ref={ref} className="aspect-video w-full overflow-hidden rounded-lg bg-muted [&_iframe]:h-full [&_iframe]:w-full" />;
}
