import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Loader2 } from "lucide-react";
import {
  enrollEntityInPrograms,
  getClusterEnrollmentInfo,
} from "@/lib/inscricao-entidade.functions";

interface Props {
  clusterId: string;
  clusterName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClusterEnrollDialog({ clusterId, clusterName, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchFn = useServerFn(getClusterEnrollmentInfo);
  const enrollFn = useServerFn(enrollEntityInPrograms);

  const [adminEntityId, setAdminEntityId] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["cluster-enrollment-info", clusterId, adminEntityId ?? "self"],
    queryFn: () =>
      fetchFn({
        data: { cluster_id: clusterId, ...(adminEntityId ? { entity_id: adminEntityId } : {}) },
      }),
    enabled: open,
  });

  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data) return;
    const initial: Record<string, boolean> = {};
    for (const p of data.programs) {
      if (p.enrollment_open && !p.enrollment_status) initial[p.id] = true;
    }
    setSelected(initial);
    setScrolledToEnd(false);
  }, [data]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setScrolledToEnd(true);
    }
  };

  // If no PDF, allow immediate confirm
  useEffect(() => {
    if (data && !data.cluster.info_pdf_url) setScrolledToEnd(true);
  }, [data]);

  const enroll = useMutation({
    mutationFn: () =>
      enrollFn({
        data: {
          cluster_id: clusterId,
          program_ids: Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
          ...(adminEntityId ? { entity_id: adminEntityId } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Inscrição feita. Foi enviado um email de confirmação.");
      qc.invalidateQueries({ queryKey: ["my-entity-program-enrollments"] });
      qc.invalidateQueries({ queryKey: ["cluster-enrollment-info", clusterId] });
      onOpenChange(false);
      navigate({ to: "/entidade/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const canConfirm = scrolledToEnd && selectedCount > 0 && !enroll.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>{clusterName}</DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="p-6"><Skeleton className="h-[60vh] w-full" /></div>
        ) : !data.has_entity && !data.is_admin ? (
          <div className="p-6 text-sm text-muted-foreground">
            Não estás associado/a a nenhuma entidade. Contacta o administrador.
          </div>
        ) : (
          <>
            <div
              ref={scrollerRef}
              onScroll={onScroll}
              className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
            >
              {data.is_admin && (data.entities?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Entidade {data.has_entity ? "" : "(obrigatório)"}
                  </label>
                  <select
                    value={adminEntityId ?? data.acting_entity_id ?? ""}
                    onChange={(e) => setAdminEntityId(e.target.value || undefined)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— escolher entidade —</option>
                    {data.entities.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                  {!data.has_entity && (
                    <p className="text-xs text-muted-foreground">
                      És admin e não tens entidade associada. Escolhe em nome de qual entidade inscrever.
                    </p>
                  )}
                </div>
              )}

              {data.cluster.info_pdf_url ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Documento informativo do programa
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <a href={data.cluster.info_pdf_url} download target="_blank" rel="noreferrer">
                        <Download className="mr-1 h-4 w-4" />
                        Descarregar
                      </a>
                    </Button>
                  </div>
                  <iframe
                    src={`${data.cluster.info_pdf_url}#toolbar=0&view=FitH`}
                    className="w-full h-[55vh] rounded-md border bg-muted"
                    title="PDF do cluster"
                  />
                  <p className="text-xs text-muted-foreground">
                    Faz scroll até ao fim do documento para ativar a confirmação.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center">
                  Sem documento informativo carregado para este cluster.
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Programas a inscrever</p>
                {data.programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem programas disponíveis.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.programs.map((p) => {
                      const already = !!p.enrollment_status;
                      const disabled = already || !p.enrollment_open;
                      return (
                        <li
                          key={p.id}
                          className="flex items-center gap-3 rounded-md border p-3 text-sm"
                        >
                          <Checkbox
                            checked={!!selected[p.id]}
                            disabled={disabled}
                            onCheckedChange={(v) =>
                              setSelected((s) => ({ ...s, [p.id]: !!v }))
                            }
                          />
                          <div className="flex-1">
                            <p className="font-medium">{p.title ?? "Programa"}</p>
                            {already && (
                              <p className="text-xs text-muted-foreground">
                                Já inscrito (estado: {p.enrollment_status})
                              </p>
                            )}
                            {!already && !p.enrollment_open && (
                              <p className="text-xs text-muted-foreground">
                                Inscrições encerradas
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Sentinel — ensures scroll reaches the very bottom even on short docs */}
              <div className="h-2" />
            </div>

            <div className="border-t px-6 py-4 flex justify-center">
              <Button
                size="lg"
                disabled={!canConfirm}
                onClick={() => enroll.mutate()}
                className="min-w-[260px]"
              >
                {enroll.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Li e percebi o documento
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
