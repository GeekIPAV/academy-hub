import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, ChevronsUpDown, Eye, GripVertical, Import, Pencil, Plus, Trash2, Video } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/rich-text-editor";
import { formatarDuracao, PassoTipoIcon, TIPO_PASSO, TIPO_PASSO_DESCRICAO } from "@/components/elearning/shared";
import { VimeoPlayer, parseVimeoId } from "@/components/elearning/VimeoPlayer";
import { cn } from "@/lib/utils";
import {
  deleteItem,
  getCursoAdmin,
  importarTemasCluster,
  listOpcoesElearning,
  reordenar,
  upsertModulo,
  upsertPasso,
} from "@/lib/admin-elearning.functions";

type Modulos = Awaited<ReturnType<typeof getCursoAdmin>>["modulos"];
type Modulo = Modulos[number];
type Passo = Modulo["passos"][number];
type Pergunta = Passo["perguntas"][number];

function Sortable({ id, children }: { id: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const handle = (
    <button type="button" className="cursor-grab touch-none text-muted-foreground" aria-label="Arrastar" {...attributes} {...listeners}>
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>{children(handle)}</div>;
}

export function ConteudoBuilder({ cursoId, clusterId, modalidade, modulos: initial }: { cursoId: string; clusterId: string | null; modalidade: string; modulos: Modulos }) {
  const qc = useQueryClient();
  const [modulos, setModulos] = useState(initial);
  useEffect(() => setModulos(initial), [initial]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-elearning", "curso", cursoId] });
  const reorderFn = useServerFn(reordenar);
  const importFn = useServerFn(importarTemasCluster);
  const delFn = useServerFn(deleteItem);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [modEdit, setModEdit] = useState<Partial<Modulo> | null>(null);
  const [passoEdit, setPassoEdit] = useState<{ modulo_id: string; passo?: Passo } | null>(null);
  const [tipoPara, setTipoPara] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ tabela: "cursos_modulos" | "cursos_passos"; id: string; label: string } | null>(null);

  const imp = useMutation({
    mutationFn: () => importFn({ data: { cursoId, clusterId: clusterId! } }),
    onSuccess: (r) => { toast.success(`${r.importados} tema(s) importado(s) como módulos.`); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (v: { tabela: "cursos_modulos" | "cursos_passos"; id: string }) => delFn({ data: v }),
    onSuccess: () => { toast.success("Eliminado."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const onModDrag = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = modulos.findIndex((m) => m.id === e.active.id);
    const to = modulos.findIndex((m) => m.id === e.over!.id);
    const next = arrayMove(modulos, from, to);
    setModulos(next);
    reorderFn({ data: { tabela: "cursos_modulos", ids: next.map((m) => m.id) } }).catch((err) => toast.error(err.message));
  };
  const onPassoDrag = (mid: string) => (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setModulos((ms) => ms.map((m) => {
      if (m.id !== mid) return m;
      const from = m.passos.findIndex((p) => p.id === e.active.id);
      const to = m.passos.findIndex((p) => p.id === e.over!.id);
      const passos = arrayMove(m.passos, from, to);
      reorderFn({ data: { tabela: "cursos_passos", ids: passos.map((p) => p.id), modulo_id: mid } }).catch((err) => toast.error(err.message));
      return { ...m, passos };
    }));
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setModEdit({})}><Plus className="mr-1 h-4 w-4" /> Novo módulo</Button>
        {clusterId && (
          <Button size="sm" variant="outline" disabled={imp.isPending} onClick={() => imp.mutate()}>
            <Import className="mr-1 h-4 w-4" /> Importar temas do cluster
          </Button>
        )}
      </div>
      {!modulos.length && <Card className="p-6 text-center text-sm text-muted-foreground">Sem módulos. Cria um ou importa os temas do cluster.</Card>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onModDrag}>
        <SortableContext items={modulos.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          {modulos.map((m, i) => (
            <Sortable key={m.id} id={m.id}>
              {(handle) => (
                 <Card className="mb-3 min-w-0 p-4">
                   <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2">
                    {handle}
                    <div className="min-w-0 flex-1"><p className="font-medium">{i + 1}. {m.title}</p><p className="text-xs text-muted-foreground">{m.passos.length ? `${m.passos.length} passos · ${formatarDuracao(m.passos.reduce((n, p) => n + (p.duracao_min ?? 0), 0))}` : "Módulo sem passos"}</p></div>
                     {modalidade === "turma" && m.abertura_dias != null && <span className="col-span-full ml-7 text-xs text-muted-foreground sm:col-span-1 sm:ml-0">Abre ao dia {m.abertura_dias}</span>}
                    <Button size="icon" variant="ghost" aria-label="Editar módulo" onClick={() => setModEdit(m)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Eliminar módulo" onClick={() => setDeleteTarget({ tabela: "cursos_modulos", id: m.id, label: "o módulo e todos os seus passos" })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                   <div className="mt-2 min-w-0 space-y-1 sm:ml-6">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onPassoDrag(m.id)}>
                      <SortableContext items={m.passos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                        {m.passos.map((p) => (
                          <Sortable key={p.id} id={p.id}>
                            {(h) => (
                               <div className="grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto] items-center gap-1 rounded-md border px-2 py-1.5 text-sm sm:gap-2">
                                {h}
                                 <PassoTipoIcon tipo={p.tipo} className="h-4 w-4 text-muted-foreground" />
                                  <span className="hidden w-16 text-xs text-muted-foreground sm:block">{TIPO_PASSO[p.tipo]}</span>
                                 <span className="min-w-0 truncate">{p.title}{!p.obrigatorio && <span className="text-xs text-muted-foreground"> · opcional</span>}</span>
                                 <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Pré-visualizar passo" asChild><a href={`/elearning/${cursoId}/passo/${p.id}`} target="_blank" rel="noreferrer"><Eye className="h-3.5 w-3.5" /></a></Button>
                                 <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar passo" onClick={() => setPassoEdit({ modulo_id: m.id, passo: p })}><Pencil className="h-3.5 w-3.5" /></Button>
                                 <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Eliminar passo" onClick={() => setDeleteTarget({ tabela: "cursos_passos", id: p.id, label: "este passo" })}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            )}
                          </Sortable>
                        ))}
                      </SortableContext>
                    </DndContext>
                    <Button size="sm" variant="ghost" onClick={() => setTipoPara(m.id)}><Plus className="mr-1 h-4 w-4" /> Adicionar passo</Button>
                  </div>
                </Card>
              )}
            </Sortable>
          ))}
        </SortableContext>
      </DndContext>

      {modEdit && <ModuloDialog cursoId={cursoId} modalidade={modalidade} value={modEdit} onClose={() => setModEdit(null)} onSaved={refresh} />}
      {passoEdit && <PassoDialog moduloId={passoEdit.modulo_id} passo={passoEdit.passo} onClose={() => setPassoEdit(null)} onSaved={refresh} />}
      <Dialog open={!!tipoPara} onOpenChange={(o) => !o && setTipoPara(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Que tipo de passo queres adicionar?</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">{Object.entries(TIPO_PASSO).map(([tipo, label]) => <button key={tipo} type="button" className="flex gap-3 border p-4 text-left hover:border-primary hover:bg-primary/5" onClick={() => { const modulo_id = tipoPara; setTipoPara(null); if (modulo_id) setPassoEdit({ modulo_id, passo: { tipo } as Passo }); }}><PassoTipoIcon tipo={tipo} className="mt-0.5 h-5 w-5 text-primary" /><span><strong className="block">{label}</strong><span className="text-xs text-muted-foreground">{TIPO_PASSO_DESCRICAO[tipo]}</span></span></button>)}</div></DialogContent></Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar conteúdo?</AlertDialogTitle><AlertDialogDescription>Esta ação elimina {deleteTarget?.label} e não pode ser anulada.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteTarget) del.mutate({ tabela: deleteTarget.tabela, id: deleteTarget.id }); setDeleteTarget(null); }}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function ModuloDialog({ cursoId, modalidade, value, onClose, onSaved }: { cursoId: string; modalidade: string; value: Partial<Modulo>; onClose: () => void; onSaved: () => void }) {
  const fn = useServerFn(upsertModulo);
  const [f, setF] = useState(value);
  const m = useMutation({
    mutationFn: () => fn({ data: { id: f.id, curso_id: cursoId, title: f.title ?? "", description: f.description ?? null, tema_id: f.tema_id ?? null, abertura_dias: f.abertura_dias ?? null } }),
    onSuccess: () => { toast.success("Módulo guardado."); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? "Editar módulo" : "Novo módulo"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Título</Label><Input value={f.title ?? ""} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="space-y-1"><Label>Descrição</Label><Textarea value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          {modalidade === "turma" && (
            <div className="space-y-1">
              <Label>Abre N dias após o início da turma (vazio = sempre aberto)</Label>
              <Input type="number" min={0} value={f.abertura_dias ?? ""} onChange={(e) => setF({ ...f, abertura_dias: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!f.title?.trim() || m.isPending} onClick={() => m.mutate()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const uid = () => Math.random().toString(36).slice(2, 10);

function PassoDialog({ moduloId, passo, onClose, onSaved }: { moduloId: string; passo?: Passo; onClose: () => void; onSaved: () => void }) {
  const fn = useServerFn(upsertPasso);
  const optFn = useServerFn(listOpcoesElearning);
  const { data: opts } = useQuery({ queryKey: ["admin-elearning", "opcoes"], queryFn: () => optFn() });
  const [title, setTitle] = useState(passo?.title ?? "");
  const [tipo, setTipo] = useState<Passo["tipo"]>((passo?.tipo as Passo["tipo"]) ?? "texto");
  const [obrig, setObrig] = useState(passo?.obrigatorio ?? true);
  const [dur, setDur] = useState<number | null>(passo?.duracao_min ?? null);
  const [c, setC] = useState<Record<string, unknown>>(passo?.conteudo ?? {});
  const [perguntas, setPerguntas] = useState<Pergunta[]>(passo?.perguntas ?? []);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [clusterFilter, setClusterFilter] = useState("all");
  const m = useMutation({
    mutationFn: () =>
      fn({
        data: {
          id: passo?.id,
          modulo_id: moduloId,
          title,
          tipo: tipo as "video" | "texto" | "recurso" | "quiz" | "reflexao",
          obrigatorio: obrig,
          duracao_min: dur,
          conteudo: c,
          perguntas: tipo === "quiz" ? perguntas.map((q) => ({ enunciado: q.enunciado, tipo: q.tipo, opcoes: q.opcoes })) : undefined,
        },
      }),
    onSuccess: () => { toast.success("Passo guardado."); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setQ = (i: number, q: Pergunta) => setPerguntas((ps) => ps.map((p, j) => (j === i ? q : p)));
  const quizInvalido = tipo === "quiz" && perguntas.some((q) => !q.enunciado.trim() || !q.opcoes.some((o) => o.correta));
  const recursos = (opts?.recursos ?? []).filter((r) => clusterFilter === "all" || r.cluster_id === clusterFilter);
  const recurso = opts?.recursos.find((r) => r.id === c.recurso_id);
  const vimeoValido = tipo !== "video" || !!parseVimeoId(String(c.vimeo ?? ""));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{passo ? "Editar passo" : "Novo passo"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_120px]">
            <div className="space-y-1"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as Passo["tipo"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TIPO_PASSO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Duração (min)</Label><Input type="number" min={0} value={dur ?? ""} onChange={(e) => setDur(e.target.value ? Number(e.target.value) : null)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={obrig} onCheckedChange={(v) => setObrig(!!v)} /> Obrigatório para concluir o curso</label>

          {tipo === "video" && (
             <div className="space-y-3"><div className="space-y-1"><Label>Vídeo Vimeo (URL ou ID)</Label><Input value={String(c.vimeo ?? "")} onChange={(e) => setC({ ...c, vimeo: e.target.value })} placeholder="https://vimeo.com/123456789" />{!!c.vimeo && !vimeoValido && <p className="text-xs text-destructive">Introduz um link Vimeo ou um ID válido.</p>}</div>{vimeoValido && !!c.vimeo ? <VimeoPlayer video={String(c.vimeo)} onProgress={() => undefined} /> : null}</div>
          )}
          {tipo === "recurso" && (
            <div className="space-y-2"><Label>Recurso do Centro de Recursos</Label><Select value={clusterFilter} onValueChange={setClusterFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clusters</SelectItem>{opts?.clusters.map((cl) => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}</SelectContent></Select><Popover open={resourceOpen} onOpenChange={setResourceOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">{recurso?.title ?? "Pesquisar recurso"}<ChevronsUpDown className="h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0"><Command><CommandInput placeholder="Pesquisar por título…" /><CommandList><CommandEmpty>Sem recursos.</CommandEmpty><CommandGroup>{recursos.map((r) => <CommandItem key={r.id} value={`${r.title} ${r.resource_type}`} onSelect={() => { setC({ ...c, recurso_id: r.id }); setResourceOpen(false); }}><Check className={cn("h-4 w-4", c.recurso_id === r.id ? "opacity-100" : "opacity-0")} />{r.cover_url && <img src={r.cover_url} alt="" className="h-8 w-8 object-cover" />}<span className="min-w-0 flex-1 truncate">{r.title}</span><span className="text-xs text-muted-foreground">{r.resource_type}</span></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover>{recurso && <div className="flex gap-3 border bg-muted/30 p-3 text-sm">{recurso.cover_url && <img src={recurso.cover_url} alt="" className="h-12 w-12 object-cover" />}<div><p className="font-medium">{recurso.title}</p><p className="text-xs text-muted-foreground">{recurso.resource_type}</p></div></div>}</div>
          )}
          {tipo === "reflexao" && (
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!c.partilhavel} onCheckedChange={(v) => setC({ ...c, partilhavel: !!v })} /> Permitir partilhar com a turma</label>
          )}
          <div className="space-y-1">
            <Label>{tipo === "texto" ? "Conteúdo" : tipo === "reflexao" ? "Enunciado da reflexão" : "Texto de apoio (opcional)"}</Label>
            <RichTextEditor value={String(c.html ?? "")} onChange={(v) => setC({ ...c, html: v })} />
          </div>

          {tipo === "quiz" && (
            <div className="space-y-3">
              <Label>Perguntas</Label>
              {perguntas.map((q, i) => (
                <Card key={i} className="space-y-2 p-3">
                  <div className="flex gap-2">
                    <Input placeholder={`Pergunta ${i + 1}`} value={q.enunciado} onChange={(e) => setQ(i, { ...q, enunciado: e.target.value })} />
                    <Select value={q.tipo} onValueChange={(v) => setQ(i, { ...q, tipo: v as "unica" | "multipla" })}>
                      <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="unica">Escolha única</SelectItem><SelectItem value="multipla">Escolha múltipla</SelectItem></SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" aria-label="Remover pergunta" onClick={() => setPerguntas((ps) => ps.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {q.opcoes.map((o, k) => (
                    <div key={o.id} className="flex items-center gap-2 pl-2">
                      {q.tipo === "unica" ? <RadioGroup value={q.opcoes.find((x) => x.correta)?.id ?? ""} onValueChange={(id) => setQ(i, { ...q, opcoes: q.opcoes.map((x) => ({ ...x, correta: x.id === id })) })}><RadioGroupItem value={o.id} aria-label="Opção correta" /></RadioGroup> : <Checkbox aria-label="Correta" checked={o.correta} onCheckedChange={(v) => setQ(i, { ...q, opcoes: q.opcoes.map((x, j) => j === k ? { ...x, correta: !!v } : x) })} />}
                      <Input className="h-8" placeholder="Opção" value={o.texto} onChange={(e) => setQ(i, { ...q, opcoes: q.opcoes.map((x, j) => (j === k ? { ...x, texto: e.target.value } : x)) })} />
                      <Input className="h-8" placeholder="Feedback (opcional)" value={o.feedback ?? ""} onChange={(e) => setQ(i, { ...q, opcoes: q.opcoes.map((x, j) => (j === k ? { ...x, feedback: e.target.value } : x)) })} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Remover opção" onClick={() => setQ(i, { ...q, opcoes: q.opcoes.filter((_, j) => j !== k) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setQ(i, { ...q, opcoes: [...q.opcoes, { id: uid(), texto: "", correta: false }] })}><Plus className="mr-1 h-3.5 w-3.5" /> Opção</Button>
                </Card>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPerguntas((ps) => [...ps, { id: uid(), enunciado: "", tipo: "unica", opcoes: [{ id: uid(), texto: "", correta: true }, { id: uid(), texto: "", correta: false }] }])}>
                <Plus className="mr-1 h-4 w-4" /> Pergunta
              </Button>
              <p className="text-xs text-muted-foreground">Marca a(s) opção(ões) correta(s) na caixa à esquerda.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!title.trim() || m.isPending || quizInvalido || !vimeoValido} onClick={() => m.mutate()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
