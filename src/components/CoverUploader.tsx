import { useRef, useState } from "react";
import { Loader2, ImagePlus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CoverUploaderProps {
  /** Folder inside the `covers` bucket, e.g. "temas", "recursos", "clusters". */
  folder: string;
  /** Stable id used for the file name (tema id, recurso id, cluster slug…). */
  id: string;
  currentUrl: string | null;
  onUploaded: (publicUrl: string) => Promise<void> | void;
  onCleared?: () => Promise<void> | void;
  /** Floating overlay (on top of an image) vs inline button. */
  variant?: "overlay" | "inline";
  className?: string;
}

export function CoverUploader({
  folder,
  id,
  currentUrl,
  onUploaded,
  onCleared,
  variant = "overlay",
  className,
}: CoverUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Seleciona um ficheiro de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx. 5MB).");
      return;
    }
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${folder}/${id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("covers")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);
      await onUploaded(pub.publicUrl);
      toast.success("Imagem atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro a carregar imagem.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    if (!onCleared) return;
    setBusy(true);
    try {
      await onCleared();
      toast.success("Imagem removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro a remover.");
    } finally {
      setBusy(false);
    }
  };

  const trigger = (label: React.ReactNode) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.click();
      }}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-xs font-medium shadow-sm backdrop-blur transition hover:bg-background",
        "border border-border",
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label}
    </button>
  );

  if (variant === "inline") {
    return (
      <div
        className={cn("flex items-center gap-1.5", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {trigger(
          <>
            <ImagePlus className="h-3.5 w-3.5" />
            {currentUrl ? "Alterar imagem" : "Adicionar imagem"}
          </>,
        )}
        {currentUrl && onCleared && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClear();
            }}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background/90 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remover
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-end justify-end p-2 opacity-0 transition group-hover:opacity-100",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div className="pointer-events-auto flex items-center gap-1.5">
        {trigger(
          <>
            <Pencil className="h-3.5 w-3.5" />
            {currentUrl ? "Alterar" : "Adicionar"}
          </>,
        )}
        {currentUrl && onCleared && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClear();
            }}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background/90 px-2 py-1 text-xs text-destructive shadow-sm backdrop-blur hover:bg-destructive/10"
            aria-label="Remover imagem"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
