import { useEffect, useRef, useState } from "react";
import { Loader2, Move, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface CoverAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialPosition?: string | null;
  initialScale?: number | null;
  /**
   * Aspect ratio of the preview (width / height). Defaults to 4/3.
   * Should match the aspect ratio of where the cover is actually rendered.
   */
  aspectRatio?: number;
  onSave: (position: string, scale: number) => Promise<void> | void;
}

function parsePos(value: string | null | undefined): { x: number; y: number } {
  if (!value) return { x: 50, y: 50 };
  const parts = value.trim().split(/\s+/);
  const parseN = (s: string) => {
    const n = parseFloat(s.replace("%", ""));
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50;
  };
  return { x: parseN(parts[0] ?? "50"), y: parseN(parts[1] ?? "50") };
}

export function CoverAdjustDialog({
  open,
  onOpenChange,
  imageUrl,
  initialPosition,
  initialScale,
  aspectRatio = 4 / 3,
  onSave,
}: CoverAdjustDialogProps) {
  const [pos, setPos] = useState(() => parsePos(initialPosition));
  const [scale, setScale] = useState(() =>
    initialScale && initialScale > 1 ? Math.min(4, initialScale) : 1,
  );
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setPos(parsePos(initialPosition));
      setScale(initialScale && initialScale > 1 ? Math.min(4, initialScale) : 1);
    }
  }, [open, initialPosition, initialScale]);

  const updateFromPointer = (clientX: number, clientY: number) => {
    if (!dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setPos({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    setIsDragging(true);
    updateFromPointer(e.clientX, e.clientY);

    const handleMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      ev.preventDefault();
      updateFromPointer(ev.clientX, ev.clientY);
    };
    const handleUp = (ev: PointerEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      draggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp, true);
      window.removeEventListener("pointercancel", handleUp, true);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, true);
    window.addEventListener("pointercancel", handleUp, true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(`${pos.x.toFixed(1)}% ${pos.y.toFixed(1)}%`, Number(scale.toFixed(2)));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPos({ x: 50, y: 50 });
    setScale(1);
  };

  const posStr = `${pos.x}% ${pos.y}%`;

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajustar imagem</DialogTitle>
          <DialogDescription>
            Arrasta para escolher o ponto focal e usa o cursor para aproximar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            ref={dragRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={cn(
              "relative w-full overflow-hidden rounded-lg border bg-muted touch-none select-none",
              dragging.current ? "cursor-grabbing" : "cursor-grab",
            )}
            style={{ aspectRatio: String(aspectRatio) }}
          >
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              className="pointer-events-none h-full w-full object-cover"
              style={{
                objectPosition: posStr,
                transform: scale !== 1 ? `scale(${scale})` : undefined,
                transformOrigin: posStr,
              }}
            />
            <div
              className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-2 ring-black/40"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            />
            <div className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
              <Move className="h-3 w-3" /> Arrastar
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ZoomIn className="h-3.5 w-3.5" /> Zoom
              </span>
              <span className="tabular-nums">{scale.toFixed(2)}x</span>
            </div>
            <Slider
              min={1}
              max={4}
              step={0.05}
              value={[scale]}
              onValueChange={(v) => setScale(v[0] ?? 1)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={handleReset} disabled={saving}>
            Repor
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
