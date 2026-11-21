import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { analisarBadgeManual, atribuirBadgeComExcecao } from "@/lib/badges-etapas.functions";
import { marcarPresencaFtp } from "@/lib/ftp-etapas.functions";
import { ETAPA_BADGE_LABEL } from "@/lib/badges-etapas";
import { formatarDataPt, hojeISO } from "@/lib/ftp-calendario";

/**
 * Atribuição manual de um badge dado por uma etapa da jornada. Se a etapa
 * já foi cumprida, atribui normalmente; se não, propõe cumprir a etapa
 * (presença na FTP) ou registar uma exceção com motivo.
 */
export function DecisaoBadgeEtapa({
  badgeId,
  userId,
  userNome,
  onAtribuirNormal,
  onFeito,
  onCancelar,
  pendingNormal,
}: {
  badgeId: string;
  userId: string;
  userNome: string;
  onAtribuirNormal: () => void;
  onFeito: () => void;
  onCancelar: () => void;
  pendingNormal: boolean;
}) {
  const qc = useQueryClient();
  const analisar = useServerFn(analisarBadgeManual);
  const excecaoFn = useServerFn(atribuirBadgeComExcecao);
  const presencaFn = useServerFn(marcarPresencaFtp);
  const { data, isLoading } = useQuery({
    queryKey: ["analise-badge", badgeId, userId],
    queryFn: () => analisar({ data: { badgeId, userId } }),
  });
  const pendente = data?.etapas.find((e) => !e.cumprida) ?? null;
  const podePresenca =
    pendente?.etapa === "presenca_ftp" && !!pendente.ftp?.start_date && hojeISO() >= pendente.ftp.start_date;
  const [escolha, setEscolha] = useState<"etapa" | "excecao" | null>(null);
  const [motivo, setMotivo] = useState("");
  const opcao = escolha ?? (podePresenca ? "etapa" : "excecao");

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["badges"] });
    qc.invalidateQueries({ queryKey: ["acompanhamento"] });
  };
  const presenca = useMutation({
    mutationFn: () => presencaFn({ data: { ftpId: pendente!.ftp!.id, userId, presenca: "presente" } }),
    onSuccess: () => {
      toast.success("Presença registada. O badge foi dado pela etapa.");
      invalidar();
      onFeito();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const excecao = useMutation({
    mutationFn: () =>
      excecaoFn({ data: { badgeId, userId, programId: pendente!.programId, etapa: pendente!.etapa, motivo } }),
    onSuccess: () => {
      toast.success("Badge atribuído como exceção. Fica visível na jornada.");
      invalidar();
      onFeito();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />A verificar a jornada…
      </div>
    );
  }

  if (!pendente) {
    return (
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button disabled={pendingNormal} onClick={onAtribuirNormal}>
          Atribuir
        </Button>
      </div>
    );
  }

  const ftpData = pendente.ftp?.start_date ? formatarDataPt(pendente.ftp.start_date, { day: "numeric", month: "short" }) : null;

  return (
    <div className="space-y-4">
      <div role="note" className="rounded-lg bg-[#E6EDF6] px-3 py-2.5 text-sm text-secondary">
        <strong className="font-semibold">Este badge é dado por uma etapa da jornada.</strong> Normalmente chega com «
        {ETAPA_BADGE_LABEL[pendente.etapa]}» ({pendente.programTitle ?? "programa"}). {userNome} ainda não cumpriu essa etapa.
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-[13px] font-semibold text-secondary">O que queres fazer?</legend>
        {pendente.etapa === "presenca_ftp" && pendente.ftp && (
          <label
            className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${opcao === "etapa" ? "border-secondary bg-secondary/5" : ""} ${podePresenca ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
          >
            <input
              type="radio"
              name="decisao-badge"
              className="mt-1 accent-[#FF8226]"
              checked={opcao === "etapa"}
              disabled={!podePresenca}
              onChange={() => setEscolha("etapa")}
            />
            <span>
              <span className="block font-semibold text-secondary">
                Registar a presença na FTP{ftpData ? ` de ${ftpData}` : ""} <span className="font-medium text-[#11643F]">· recomendado</span>
              </span>
              <span className="block text-xs text-muted-foreground">
                {podePresenca ? "A jornada avança para «Semana Ubuntu» e o badge é dado como sempre." : "Só a partir do dia da FTP."}
              </span>
            </span>
          </label>
        )}
        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${opcao === "excecao" ? "border-secondary bg-secondary/5" : ""}`}>
          <input
            type="radio"
            name="decisao-badge"
            className="mt-1 accent-[#FF8226]"
            checked={opcao === "excecao"}
            onChange={() => setEscolha("excecao")}
          />
          <span>
            <span className="block font-semibold text-secondary">Atribuir como exceção</span>
            <span className="block text-xs text-muted-foreground">
              Dá o badge sem a etapa cumprida. Fica visível na jornada como «Por decisão da equipa».
            </span>
          </span>
        </label>
      </fieldset>

      {opcao === "excecao" && (
        <div className="space-y-1.5">
          <Label htmlFor="motivo-excecao">
            Motivo <span className="font-normal text-muted-foreground">(obrigatório, fica no histórico)</span>
          </Label>
          <Textarea
            id="motivo-excecao"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: esteve na FTP, a presença ficou por registar."
          />
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        {opcao === "etapa" ? (
          <Button disabled={presenca.isPending} onClick={() => presenca.mutate()}>
            Registar presença
          </Button>
        ) : (
          <Button disabled={motivo.trim().length < 3 || excecao.isPending} onClick={() => excecao.mutate()}>
            Atribuir exceção
          </Button>
        )}
      </div>
    </div>
  );
}
