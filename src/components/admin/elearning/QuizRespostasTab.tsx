import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listRespostasQuiz } from "@/lib/elearning-quiz-respostas.functions";

export function QuizRespostasTab({ cursoId }: { cursoId: string }) {
  const fn = useServerFn(listRespostasQuiz);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "quiz-respostas", cursoId], queryFn: () => fn({ data: { cursoId } }) });
  const [filtro, setFiltro] = useState("");
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  const lista = (data ?? []).filter((i) => `${i.participante} ${i.quiz}`.toLowerCase().includes(filtro.toLowerCase()));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <Input className="max-w-xs" placeholder="Procurar participante ou quiz" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      <span className="text-sm text-muted-foreground">{(data ?? []).length} tentativas registadas</span>
    </div>
    {!lista.length ? <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Ainda não há respostas aos quizzes.</p> : <div className="grid min-w-0 gap-4 lg:grid-cols-2">{lista.map((t) => <Card key={t.id} className="min-w-0 space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-secondary">{t.participante}</p>
        <Badge variant={t.aprovado ? "default" : "destructive"}>{t.nota ?? "—"}% · {t.aprovado ? "Aprovado" : "Não aprovado"}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{t.modulo} · {t.quiz} · {new Date(t.data).toLocaleString("pt-PT")}</p>
      {t.perguntas.length ? <ul className="space-y-2">{t.perguntas.map((q, i) => <li key={i} className="flex gap-2 text-sm">{q.correta ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}<span className="min-w-0 break-words"><span className="font-medium">{q.enunciado}</span><span className="block text-muted-foreground">{q.resposta || "Sem resposta"}</span></span></li>)}</ul> : <p className="text-xs text-muted-foreground">Tentativa anterior a este registo: só a nota foi guardada.</p>}
    </Card>)}</div>}
  </div>;
}
