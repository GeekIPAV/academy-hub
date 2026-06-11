import { useRef, useState } from "react";
import { Loader2, FileUp, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  folder: string;
  id: string;
  currentUrl: string | null;
  onUploaded: (publicUrl: string) => Promise<void> | void;
  onCleared?: () => Promise<void> | void;
}

export function PdfUploader({ folder, id, currentUrl, onUploaded, onCleared }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Seleciona um ficheiro PDF.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("PDF demasiado grande (máx. 20MB).");
      return;
    }
    setBusy(true);
    try {
      const path = `${folder}/${id}-${Date.now()}.pdf`;
      const { error } = await supabase.storage
        .from("covers")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);
      await onUploaded(pub.publicUrl);
      toast.success("PDF atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro a carregar PDF.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
        <span className="ml-1">{currentUrl ? "Substituir PDF" : "Enviar PDF"}</span>
      </Button>
      {currentUrl && (
        <>
          <Button asChild type="button" variant="ghost" size="sm">
            <a href={currentUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          {onCleared && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void onCleared()}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
