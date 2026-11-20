import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileSpreadsheet, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  confirmarEnvioAlunos,
  getDocumentosSemanaUbuntu,
  listarEnviosAlunos,
  pedirUploadAlunos,
  urlEnvioAlunos,
} from "@/lib/semana-ubuntu.functions";
import { formatarDataPt } from "@/lib/ftp-calendario";

type Alvo = { cohortId: string; acaoId?: never } | { acaoId: string; cohortId?: never };

/**
 * Dados dos alunos para a Semana Ubuntu (formação ou replicação): modelos para
 * descarregar, envio do Excel e histórico. A equipa IPAV é avisada a cada envio.
 */
export function AlunosSemanaUbuntu({ alvo, podeEnviar = true, compacto }: { alvo: Alvo; podeEnviar?: boolean; compacto?: boolean }) {
  const qc = useQueryClient();
  const docsFn = useServerFn(getDocumentosSemanaUbuntu);
  const listFn = useServerFn(listarEnviosAlunos);
  const pedirFn = useServerFn(pedirUploadAlunos);
  const confirmarFn = useServerFn(confirmarEnvioAlunos);
  const urlFn = useServerFn(urlEnvioAlunos);
  const chave = ["semana-ubuntu-alunos", alvo.cohortId ?? alvo.acaoId];
  const { data: docs } = useQuery({ queryKey: ["semana-ubuntu-documentos"], queryFn: () => docsFn() });
  const { data: envios } = useQuery({ queryKey: chave, queryFn: () => listFn({ data: alvo }) });
  const input = useRef<HTMLInputElement>(null);
  const [aEnviar, setAEnviar] = useState(false);

  const enviar = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) return toast.error("Ficheiro demasiado grande (máx. 15 MB).");
    setAEnviar(true);
    try {
      const { path, token } = await pedirFn({ data: { ...alvo, nome: file.name } });
      const { error } = await supabase.storage.from("semana-ubuntu").uploadToSignedUrl(path, token, file);
      if (error) throw new Error(error.message);
      await confirmarFn({ data: { ...alvo, path, nome: file.name } });
      toast.success("Excel enviado. A equipa IPAV foi avisada.");
      qc.invalidateQueries({ queryKey: chave });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar o ficheiro.");
    } finally {
      setAEnviar(false);
      if (input.current) input.current.value = "";
    }
  };

  const abrir = useMutation({
    mutationFn: (id: string) => urlFn({ data: { id } }),
    onSuccess: (r) => window.open(r.url, "_blank", "noopener"),
    onError: (e: Error) => toast.error(e.message),
  });

  const ultimo = envios?.[0] ?? null;

  return (
    <div className={`space-y-3 ${compacto ? "" : "rounded-lg border p-4"}`}>
      <div>
        <p className="text-[13px] font-medium text-secondary">Dados dos alunos</p>
        <p className="text-xs text-muted-foreground">
          Envia o Excel com os dados dos alunos e recolhe as autorizações dos Encarregados de Educação antes da Semana Ubuntu.
        </p>
      </div>
      {(docs?.autorizacao_url || docs?.excel_url) && (
        <div className="flex flex-wrap gap-2">
          {docs.autorizacao_url && (
            <Button asChild size="sm" variant="outline">
              <a href={docs.autorizacao_url} target="_blank" rel="noreferrer">
                <FileText className="mr-1.5 h-4 w-4" />
                {docs.autorizacao_nome || "Modelo de autorização dos EE"}
              </a>
            </Button>
          )}
          {docs.excel_url && (
            <Button asChild size="sm" variant="outline">
              <a href={docs.excel_url} target="_blank" rel="noreferrer">
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                {docs.excel_nome || "Modelo do Excel dos alunos"}
              </a>
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {podeEnviar && (
          <>
            <input
              ref={input}
              type="file"
              accept=".xlsx,.xls,.csv,.ods"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void enviar(f);
              }}
            />
            <Button size="sm" disabled={aEnviar} onClick={() => input.current?.click()}>
              {aEnviar ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
              {ultimo ? "Enviar nova versão" : "Enviar Excel dos alunos"}
            </Button>
          </>
        )}
        {ultimo ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-secondary underline-offset-4 hover:underline"
            onClick={() => abrir.mutate(ultimo.id)}
          >
            <Download className="h-3.5 w-3.5" />
            {ultimo.ficheiro_nome} · {formatarDataPt(ultimo.enviado_em.slice(0, 10))}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Ainda não foi enviado.</span>
        )}
      </div>
    </div>
  );
}

/** Linha curta para a equipa: último Excel enviado, com link para descarregar. */
export function EnvioAlunosResumo({ cohortId }: { cohortId: string }) {
  const listFn = useServerFn(listarEnviosAlunos);
  const urlFn = useServerFn(urlEnvioAlunos);
  const { data } = useQuery({ queryKey: ["semana-ubuntu-alunos", cohortId], queryFn: () => listFn({ data: { cohortId } }) });
  const abrir = useMutation({
    mutationFn: (id: string) => urlFn({ data: { id } }),
    onSuccess: (r) => window.open(r.url, "_blank", "noopener"),
    onError: (e: Error) => toast.error(e.message),
  });
  const ultimo = data?.[0];
  if (!ultimo) return <span className="text-xs text-muted-foreground">Excel dos alunos por enviar</span>;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs text-secondary underline-offset-4 hover:underline"
      onClick={() => abrir.mutate(ultimo.id)}
    >
      <Download className="h-3.5 w-3.5" />
      Excel dos alunos · {formatarDataPt(ultimo.enviado_em.slice(0, 10))}
    </button>
  );
}
