import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { guardarComentarioReflexao, listReflexoesCurso } from "@/lib/elearning-comentarios.functions";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

type Item = Awaited<ReturnType<typeof listReflexoesCurso>>[number];

function Entrada({ item, cursoId }: { item: Item; cursoId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(guardarComentarioReflexao);
  const [texto, setTexto] = useState(item.comentario ?? "");
  const m = useMutation({
    mutationFn: () => fn({ data: { progressoId: item.id, texto } }),
    onSuccess: () => { toast.success("Comentário guardado"); qc.invalidateQueries({ queryKey: ["admin", "reflexoes", cursoId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return <Card className="min-w-0 space-y-3 p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="font-semibold text-secondary">{item.participante}</p>
      {item.data && <span className="text-xs text-muted-foreground">{new Date(item.data).toLocaleDateString("pt-PT")}</span>}
    </div>
    <p className="text-xs text-muted-foreground">{item.modulo} · {item.passo}</p>
    <div className="rich-text break-words rounded-lg border bg-muted/40 p-3 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(item.resposta) }} />
    <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Comentário da Equipa IPAV a esta resposta…" rows={3} />
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{item.comentario_em ? `Comentado por ${item.comentario_autor ?? "Equipa IPAV"} em ${new Date(item.comentario_em).toLocaleDateString("pt-PT")}` : "Sem comentário"}</span>
      <Button size="sm" disabled={m.isPending || texto === (item.comentario ?? "")} onClick={() => m.mutate()}>Guardar comentário</Button>
    </div>
  </Card>;
}

export function ReflexoesTab({ cursoId }: { cursoId: string }) {
  const fn = useServerFn(listReflexoesCurso);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "reflexoes", cursoId], queryFn: () => fn({ data: { cursoId } }) });
  const [filtro, setFiltro] = useState("");
  const [pendentes, setPendentes] = useState(false);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  const lista = (data ?? []).filter((i) => (!pendentes || !i.comentario) && (`${i.participante} ${i.passo}`).toLowerCase().includes(filtro.toLowerCase()));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <Input className="max-w-xs" placeholder="Procurar participante ou momento" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      <Button variant={pendentes ? "default" : "outline"} size="sm" onClick={() => setPendentes((v) => !v)}>Só por comentar</Button>
      <span className="text-sm text-muted-foreground">{(data ?? []).filter((i) => !i.comentario).length} por comentar · {(data ?? []).length} respostas</span>
    </div>
    {!lista.length ? <p className="flex items-center gap-2 rounded-xl border bg-card p-5 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" />Sem respostas de reflexão para mostrar.</p>
      : <div className="grid min-w-0 gap-4 lg:grid-cols-2">{lista.map((i) => <Entrada key={i.id} item={i} cursoId={cursoId} />)}</div>}
  </div>;
}
