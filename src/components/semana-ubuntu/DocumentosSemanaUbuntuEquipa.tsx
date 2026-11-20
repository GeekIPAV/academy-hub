import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Section } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getDocumentosSemanaUbuntu,
  guardarDocumentosSemanaUbuntu,
  type DocumentosSemanaUbuntu,
} from "@/lib/semana-ubuntu.functions";

/** Modelos que as escolas descarregam para a Semana Ubuntu (comuns a todos os programas). */
export function DocumentosSemanaUbuntuEquipa() {
  const qc = useQueryClient();
  const fn = useServerFn(getDocumentosSemanaUbuntu);
  const saveFn = useServerFn(guardarDocumentosSemanaUbuntu);
  const { data } = useQuery({ queryKey: ["semana-ubuntu-documentos"], queryFn: () => fn() });
  const m = useMutation({
    mutationFn: (d: DocumentosSemanaUbuntu) => saveFn({ data: d }),
    onSuccess: () => {
      toast.success("Modelos da Semana Ubuntu guardados.");
      qc.invalidateQueries({ queryKey: ["semana-ubuntu-documentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!data) return null;
  return (
    <Section
      title="Modelos da Semana Ubuntu"
      description="As escolas descarregam estes modelos ao marcar a Semana Ubuntu (formação e replicações). Valem para todos os programas."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Modelo
          rotulo="Modelo de autorização dos Encarregados de Educação"
          url={data.autorizacao_url}
          nome={data.autorizacao_nome}
          pending={m.isPending}
          onGuardar={(url, nome) => m.mutate({ ...data, autorizacao_url: url, autorizacao_nome: nome })}
        />
        <Modelo
          rotulo="Modelo do Excel dos alunos"
          url={data.excel_url}
          nome={data.excel_nome}
          pending={m.isPending}
          onGuardar={(url, nome) => m.mutate({ ...data, excel_url: url, excel_nome: nome })}
        />
      </div>
    </Section>
  );
}

function Modelo({
  rotulo,
  url,
  nome,
  pending,
  onGuardar,
}: {
  rotulo: string;
  url: string | null;
  nome: string | null;
  pending: boolean;
  onGuardar: (url: string | null, nome: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const carregar = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) return toast.error("Ficheiro demasiado grande (máx. 20 MB).");
    setBusy(true);
    try {
      const safe = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
      const path = `semana-ubuntu/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("covers").upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      onGuardar(data.publicUrl, file.name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível carregar o ficheiro.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-w-0 space-y-2 rounded-lg border p-4">
      <p className="text-[13px] font-medium text-secondary">{rotulo}</p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block truncate text-xs text-secondary underline">
          {nome || url}
        </a>
      ) : (
        <p className="text-xs text-muted-foreground">Ainda sem modelo.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex">
          <Input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void carregar(f);
              e.target.value = "";
            }}
          />
          <span className="inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-xs font-medium hover:bg-muted">
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
            {url ? "Substituir" : "Carregar"}
          </span>
        </label>
        {url && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => onGuardar(null, null)}>
            Retirar
          </Button>
        )}
      </div>
    </div>
  );
}
