import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Copy, GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EstadoSelect, FormatoSelect, PaisSelect } from "@/components/admin/acoes/AcaoCampos";
import { INSCRICOES_ABERTAS, INSCRICOES_FECHADAS } from "@/lib/acoes-opcoes";
import { CoverUploader } from "@/components/CoverUploader";
import { CoverImage } from "@/components/CoverImage";
import { Section } from "@/components/shell/PageHeader";
import { FormField } from "@/components/shell/FormField";
import { StatusChip } from "@/components/shell/StatusChip";
import {
  listProjetos,
  getAcaoVisibilidade,
  saveAcaoVisibilidade,
} from "@/lib/projetos.functions";
import {
  patchAcao,
  type AcaoRow,
  type RequiredFieldDef,
} from "@/lib/admin-acoes-gestao.functions";
import { listProdutos } from "@/lib/produtos.functions";

const TIPOS_CAMPO: [string, string][] = [
  ["text", "Texto"],
  ["email", "Email"],
  ["tel", "Telefone"],
  ["number", "Número"],
  ["date", "Data"],
  ["textarea", "Texto longo"],
  ["checkbox", "Caixa de confirmação"],
  ["select", "Lista (escolha única)"],
  ["multiselect", "Lista (várias escolhas)"],
];

const STATUS_PROJETO: [string, string][] = [
  ["possibilidade", "Possibilidade"],
  ["em_arranque", "Em arranque"],
  ["em_contratualizacao", "Em contratualização"],
  ["em_progresso", "Em progresso"],
  ["institucional", "Institucional"],
  ["em_fecho", "Em fecho"],
  ["terminado", "Terminado"],
  ["em_curso", "Em curso"],
];

function normTxt(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function slugifyFieldName(label: string, idx: number): string {
  const s = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || `campo_${idx + 1}`;
}

function formDe(acao: AcaoRow) {
  return {
    title: acao.title ?? "",
    description: acao.description ?? "",
    formato: acao.formato ?? "",
    localizacao: acao.localizacao ?? "",
    pais: acao.pais ?? "",
    produto_id: acao.produto_id ?? "",
    email_responsavel: acao.email_responsavel ?? "",
    start_date: acao.start_date ?? "",
    end_date: acao.end_date ?? "",
    registration_status: acao.registration_status ?? "",
    status: acao.status ?? "",
    action_type: acao.action_type ?? "",
    max_capacity: acao.max_capacity?.toString() ?? "",
    fotos_link: acao.fotos_link ?? "",
    avaliacao_satisfacao_link: acao.avaliacao_satisfacao_link ?? "",
    avaliacao_impacto_link: acao.avaliacao_impacto_link ?? "",
  };
}

/**
 * Dados da ação, em blocos com título. Um só botão de guardar, fixo em baixo,
 * guarda os campos da ação e a visibilidade por projetos.
 * As avaliações já não se gerem aqui: estão no separador Avaliações.
 */
export function AcaoDadosForm({ acao }: { acao: AcaoRow }) {
  const qc = useQueryClient();
  const patchFn = useServerFn(patchAcao);
  const saveVisFn = useServerFn(saveAcaoVisibilidade);
  const fetchVis = useServerFn(getAcaoVisibilidade);
  const fetchProj = useServerFn(listProjetos);
  const fetchProdutos = useServerFn(listProdutos);

  const { data: produtos } = useQuery({
    queryKey: ["produtos-catalogo"],
    queryFn: () => fetchProdutos(),
    retry: false,
  });
  const { data: projetos = [] } = useQuery({ queryKey: ["projetos"], queryFn: () => fetchProj() });
  const { data: vis } = useQuery({
    queryKey: ["acao-visibilidade", acao.id],
    queryFn: () => fetchVis({ data: { actionId: acao.id } }),
  });

  const [form, setForm] = useState(() => formDe(acao));
  const [requiredFields, setRequiredFields] = useState<RequiredFieldDef[]>(
    () => acao.required_fields ?? [],
  );
  const [modo, setModo] = useState<"todos" | "projetos">("todos");
  const [sel, setSel] = useState<string[]>([]);
  const [visInicial, setVisInicial] = useState<string>("");
  const [base, setBase] = useState(() => JSON.stringify([formDe(acao), acao.required_fields ?? []]));

  useEffect(() => {
    if (vis) {
      setModo(vis.visibilidade);
      setSel(vis.projectIds);
      setVisInicial(JSON.stringify([vis.visibilidade, [...vis.projectIds].sort()]));
    }
  }, [vis]);

  const visAtual = JSON.stringify([modo, [...sel].sort()]);
  const alterado =
    JSON.stringify([form, requiredFields]) !== base || (visInicial !== "" && visAtual !== visInicial);

  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const mut = useMutation({
    mutationFn: async () => {
      await patchFn({
        data: {
          actionId: acao.id,
          fields: {
            title: form.title || null,
            description: form.description || null,
            formato: form.formato || null,
            localizacao: form.localizacao || null,
            pais: form.pais || null,
            produto_id: form.produto_id || null,
            email_responsavel: form.email_responsavel || null,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            registration_status: form.registration_status || null,
            status: form.status || undefined,
            action_type: form.action_type || null,
            max_capacity: form.max_capacity === "" ? null : Number(form.max_capacity),
            fotos_link: form.fotos_link || null,
            avaliacao_satisfacao_link: form.avaliacao_satisfacao_link || null,
            avaliacao_impacto_link: form.avaliacao_impacto_link || null,
            required_fields: requiredFields.map((f, i) => ({
              ...f,
              name: (f.name && f.name.trim()) || slugifyFieldName(f.label || "", i),
            })),
          },
        },
      });
      if (visInicial !== "" && visAtual !== visInicial) {
        await saveVisFn({ data: { actionId: acao.id, visibilidade: modo, projectIds: sel } });
      }
    },
    onSuccess: () => {
      toast.success("Alterações guardadas.");
      setBase(JSON.stringify([form, requiredFields]));
      setVisInicial(visAtual);
      qc.invalidateQueries({ queryKey: ["admin-acoes-full"] });
      qc.invalidateQueries({ queryKey: ["acao-visibilidade", acao.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível guardar."),
  });

  const descartar = () => {
    setForm(formDe(acao));
    setRequiredFields(acao.required_fields ?? []);
    if (vis) {
      setModo(vis.visibilidade);
      setSel(vis.projectIds);
    }
  };

  const persistCover = async (fields: {
    cover_url?: string | null;
    cover_position?: string;
    cover_scale?: number;
  }) => {
    await patchFn({ data: { actionId: acao.id, fields } });
    qc.invalidateQueries({ queryKey: ["admin-acoes-full"] });
  };

  const inscricaoUrl =
    typeof window !== "undefined" ? `${window.location.origin}/evento/${acao.id}` : `/evento/${acao.id}`;
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(inscricaoUrl);
      setCopiado(true);
      toast.success("Link de inscrição copiado.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const temLinksAntigos = !!(acao.avaliacao_satisfacao_link || acao.avaliacao_impacto_link);
  const abertas = form.registration_status === INSCRICOES_ABERTAS;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate();
      }}
    >
      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-[999_1_560px] space-y-5">
          <Section title="Informação geral" description="O que aparece na página pública e nas listas.">
            <FormField id="acao-titulo" label="Título">
              <Input id="acao-titulo" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField id="acao-produto" label="Produto">
                <Select
                  value={form.produto_id || "__none__"}
                  onValueChange={(v) => set("produto_id", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="acao-produto">
                    <SelectValue placeholder="Sem produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem produto</SelectItem>
                    {(produtos ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.tipo ? ` (${p.tipo})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField id="acao-tipo" label="Tipo de ação">
                <Input
                  id="acao-tipo"
                  value={form.action_type}
                  onChange={(e) => set("action_type", e.target.value)}
                />
              </FormField>
              <FormField id="acao-formato" label="Formato">
                <FormatoSelect value={form.formato} onChange={(v) => set("formato", v)} />
              </FormField>
            </div>
            <FormField id="acao-descricao" label="Descrição">
              <Textarea
                id="acao-descricao"
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </FormField>
          </Section>

          <Section title="Datas e local">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="acao-inicio" label="Início">
                <Input
                  id="acao-inicio"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => set("start_date", e.target.value)}
                />
              </FormField>
              <FormField
                id="acao-fim"
                label="Fim"
                error={
                  form.start_date && form.end_date && form.end_date < form.start_date
                    ? "O fim tem de ser no mesmo dia ou depois do início."
                    : null
                }
              >
                <Input
                  id="acao-fim"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => set("end_date", e.target.value)}
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="acao-pais" label="País">
                <PaisSelect value={form.pais} onChange={(v) => set("pais", v)} />
              </FormField>
              <FormField
                id="acao-local"
                label={form.formato === "Online" ? "Link da sessão" : "Localização"}
                hint={form.formato === "Online" ? undefined : "Morada ou nome do espaço."}
              >
                <Input
                  id="acao-local"
                  value={form.localizacao}
                  onChange={(e) => set("localizacao", e.target.value)}
                />
              </FormField>
            </div>
          </Section>

          <Section
            title="Inscrições"
            description="Quem se pode inscrever e o que tem de preencher."
            actions={
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Switch
                  checked={abertas}
                  onCheckedChange={(c) =>
                    set("registration_status", c ? INSCRICOES_ABERTAS : INSCRICOES_FECHADAS)
                  }
                />
                {abertas ? "Inscrições abertas" : "Inscrições fechadas"}
              </label>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="acao-capacidade" label="Capacidade máxima">
                <Input
                  id="acao-capacidade"
                  type="number"
                  min={0}
                  value={form.max_capacity}
                  onChange={(e) => set("max_capacity", e.target.value)}
                />
              </FormField>
              <FormField id="acao-link" label="Link de inscrição">
                <div className="flex gap-2">
                  <Input
                    id="acao-link"
                    readOnly
                    value={inscricaoUrl}
                    className="bg-muted/40 font-mono text-xs text-muted-foreground"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={copiar} aria-label="Copiar link de inscrição">
                    {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </FormField>
            </div>
            <CamposExtra campos={requiredFields} onChange={setRequiredFields} />
          </Section>

          <Section
            title="Materiais"
            description="As avaliações já não se gerem aqui: estão no separador Avaliações."
          >
            <FormField id="acao-fotos" label="Link das fotografias">
              <Input
                id="acao-fotos"
                placeholder="https://"
                value={form.fotos_link}
                onChange={(e) => set("fotos_link", e.target.value)}
              />
            </FormField>
            {temLinksAntigos && (
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-secondary">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                  Links antigos de avaliação (externos)
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 grid gap-4 sm:grid-cols-2">
                  <FormField id="acao-sat" label="Avaliação de satisfação" hint="Usado antes das avaliações internas.">
                    <Input
                      id="acao-sat"
                      value={form.avaliacao_satisfacao_link}
                      onChange={(e) => set("avaliacao_satisfacao_link", e.target.value)}
                    />
                  </FormField>
                  <FormField id="acao-imp" label="Avaliação de impacto" hint="Usado antes das avaliações internas.">
                    <Input
                      id="acao-imp"
                      value={form.avaliacao_impacto_link}
                      onChange={(e) => set("avaliacao_impacto_link", e.target.value)}
                    />
                  </FormField>
                </CollapsibleContent>
              </Collapsible>
            )}
          </Section>
        </div>

        <aside className="min-w-0 flex-[1_1_300px] space-y-5">
          <Section title="Estado">
            <FormField id="acao-estado" label="Estado da ação">
              <EstadoSelect value={form.status} onChange={(v) => set("status", v)} />
            </FormField>
          </Section>

          <Section title="Capa">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted">
              {acao.cover_url ? (
                <CoverImage src={acao.cover_url} position={acao.cover_position} scale={acao.cover_scale} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Sem capa
                </div>
              )}
            </div>
            <CoverUploader
              variant="inline"
              folder="acoes"
              id={acao.id}
              currentUrl={acao.cover_url}
              position={acao.cover_position}
              scale={acao.cover_scale}
              aspectRatio={4 / 3}
              onUploaded={(url) => persistCover({ cover_url: url })}
              onCleared={() => persistCover({ cover_url: null })}
              onAdjusted={(pos, sc) => persistCover({ cover_position: pos, cover_scale: sc })}
            />
          </Section>

          <Section
            title="Quem vê esta ação"
            description="Ao ligar projetos, a ação fica visível só para os participantes desses projetos."
          >
            <Visibilidade
              projetos={projetos}
              modo={modo}
              setModo={setModo}
              sel={sel}
              setSel={setSel}
            />
          </Section>

          <Section title="Responsável">
            <FormField id="acao-email" label="Email do responsável">
              <Input
                id="acao-email"
                type="email"
                value={form.email_responsavel}
                onChange={(e) => set("email_responsavel", e.target.value)}
              />
            </FormField>
          </Section>
        </aside>
      </div>

      <div className="sticky bottom-3 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
          <span className="flex items-center gap-2 text-sm">
            {alterado ? (
              <>
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                Tens alterações por guardar
              </>
            ) : (
              <span className="text-muted-foreground">Sem alterações por guardar</span>
            )}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={descartar} disabled={!alterado || mut.isPending}>
              Descartar
            </Button>
            <Button type="submit" disabled={!alterado || mut.isPending}>
              <Save className="mr-1.5 h-4 w-4" />
              {mut.isPending ? "A guardar…" : "Guardar alterações"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function CamposExtra({
  campos,
  onChange,
}: {
  campos: RequiredFieldDef[];
  onChange: (c: RequiredFieldDef[]) => void;
}) {
  const update = (idx: number, patch: Partial<RequiredFieldDef>) =>
    onChange(campos.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const remove = (idx: number) => onChange(campos.filter((_, i) => i !== idx));
  const add = () => onChange([...campos, { name: "", label: "", type: "text", required: false }]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium text-secondary">Campos extra do formulário</p>
          <p className="text-xs text-muted-foreground">Perguntas a mais que quem se inscreve tem de responder.</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={add}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar campo
        </Button>
      </div>
      {campos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          Sem campos extra.
        </p>
      ) : (
        <div className="space-y-2">
          {campos.map((f, i) => {
            const precisaOpcoes = f.type === "select" || f.type === "multiselect";
            return (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="grid items-end gap-2 sm:grid-cols-[auto_1fr_180px_auto_auto]">
                  <GripVertical className="mb-2.5 hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
                  <FormField id={`campo-${i}-etiqueta`} label="Pergunta">
                    <Input
                      id={`campo-${i}-etiqueta`}
                      value={f.label ?? ""}
                      onChange={(e) => update(i, { label: e.target.value })}
                      placeholder="Por exemplo: Telemóvel"
                    />
                  </FormField>
                  <FormField id={`campo-${i}-tipo`} label="Tipo">
                    <Select value={f.type ?? "text"} onValueChange={(v) => update(i, { type: v })}>
                      <SelectTrigger id={`campo-${i}-tipo`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_CAMPO.map(([v, l]) => (
                          <SelectItem key={v} value={v}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <label className="mb-2.5 flex items-center gap-2 text-xs">
                    <Checkbox checked={!!f.required} onCheckedChange={(v) => update(i, { required: !!v })} />
                    Obrigatório
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(i)}
                    aria-label={`Apagar campo ${f.label || i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {precisaOpcoes && (
                  <FormField id={`campo-${i}-opcoes`} label="Opções" hint="Uma por linha.">
                    <Textarea
                      id={`campo-${i}-opcoes`}
                      rows={3}
                      value={(f.options ?? []).join("\n")}
                      onChange={(e) =>
                        update(i, {
                          options: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </FormField>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type ProjetoMin = { id: string; title: string; status: string };

function Visibilidade({
  projetos,
  modo,
  setModo,
  sel,
  setSel,
}: {
  projetos: ProjetoMin[];
  modo: "todos" | "projetos";
  setModo: (m: "todos" | "projetos") => void;
  sel: string[];
  setSel: (f: (s: string[]) => string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [statusSel, setStatusSel] = useState<string[]>(["em_progresso"]);
  const nq = normTxt(q.trim());
  const filtrados = useMemo(
    () =>
      projetos.filter(
        (p) =>
          (statusSel.length === 0 || statusSel.includes(p.status)) &&
          (!nq || normTxt(p.title).includes(nq)),
      ),
    [projetos, statusSel, nq],
  );

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="sr-only">Visibilidade</legend>
        {(
          [
            ["todos", "Todos os utilizadores"],
            ["projetos", "Só participantes de projetos"],
          ] as const
        ).map(([v, l]) => (
          <label
            key={v}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
              modo === v ? "border-primary bg-primary/5 font-medium" : ""
            }`}
          >
            <input
              type="radio"
              name="visibilidade"
              className="accent-[var(--primary)]"
              checked={modo === v}
              onChange={() => setModo(v)}
            />
            {l}
          </label>
        ))}
      </fieldset>

      {sel.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sel.map((id) => {
            const p = projetos.find((x) => x.id === id);
            return (
              <StatusChip key={id} tone="tag" className="max-w-full">
                <span className="max-w-[14rem] truncate">{p?.title ?? "Projeto"}</span>
                <button
                  type="button"
                  aria-label={`Remover ${p?.title ?? "projeto"}`}
                  onClick={() => setSel((s) => s.filter((x) => x !== id))}
                  className="opacity-70 hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </StatusChip>
            );
          })}
        </div>
      )}

      {modo === "projetos" && (
        <div className="space-y-2">
          <Input placeholder="Procurar projeto" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Procurar projeto" />
          <div className="flex flex-wrap gap-1.5">
            {STATUS_PROJETO.map(([k, label]) => {
              const on = statusSel.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setStatusSel((s) => (on ? s.filter((x) => x !== k) : [...s, k]))}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    on ? "border-secondary bg-secondary text-white" : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {projetos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ainda não há projetos. Cria-os em Projetos.</p>
          ) : filtrados.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum projeto encontrado.</p>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {filtrados.map((p) => (
                <label key={p.id} className="flex min-w-0 items-center gap-2 text-sm">
                  <Checkbox
                    checked={sel.includes(p.id)}
                    onCheckedChange={(c) => setSel((s) => (c ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                  />
                  <span className="truncate">{p.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
