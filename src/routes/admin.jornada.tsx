import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { RouteGate } from "@/components/RouteGate";
import { AcompanhamentoJornada } from "@/components/jornada/AcompanhamentoJornada";
import { VerComoUtilizador } from "@/components/jornada/VerComoUtilizador";
import { PageHeader, PageShell, Section } from "@/components/shell/PageHeader";
import { StatusChip, type ChipTone } from "@/components/shell/StatusChip";
import { FormField } from "@/components/shell/FormField";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MARCA_GESTAO, seo, titulo } from "@/lib/seo";
import {
  CICLO,
  ESTADO_LABEL,
  FASES_PLANO,
  FLUXO,
  FLUXO_DETALHADO,
  JORNADAS,
  RAIAS,
  contarEstados,
  eDecisao,
  tituloFluxo,
  type EstadoPasso,
  type PassoJornada,
} from "@/lib/jornada-utilizador";
import {
  FTC_DIAS_ANTES_FTP,
  FTP_MAX_EDUCADORES,
  FTP_MIN_EDUCADORES,
  formatarDataPt,
  hojeISO,
  janelaFtc,
  somarDias,
} from "@/lib/ftp-calendario";

export const Route = createFileRoute("/admin/jornada")({
  head: () => ({
    meta: seo({
      title: titulo("Jornada do utilizador", MARCA_GESTAO),
      description: "Acompanhamento de cada Educador na Formação de Educadores Ubuntu: fase atual, próximo passo e ações da equipa.",
      privada: true,
    }),
  }),
  component: () => (
    <RouteGate path="/admin/jornada">
      <JornadaPage />
    </RouteGate>
  ),
});

const TOM: Record<EstadoPasso, ChipTone> = { funciona: "green", parcial: "yellow", falta: "red" };

function EstadoChip({ estado }: { estado: EstadoPasso }) {
  return (
    <StatusChip tone={TOM[estado]} dot>
      {ESTADO_LABEL[estado]}
    </StatusChip>
  );
}

function FaseTag({ fase }: { fase?: number }) {
  if (!fase) return null;
  return (
    <StatusChip tone="tag" className="font-normal">
      Fase {fase} · {FASES_PLANO[fase]}
    </StatusChip>
  );
}

function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <EstadoChip estado="funciona" />
      <EstadoChip estado="parcial" />
      <EstadoChip estado="falta" />
      <span>· A fase indica a parte do plano de desbloqueio por etapas que fecha o passo.</span>
    </div>
  );
}

function JornadaPage() {
  const todos = useMemo(
    () => [...CICLO, ...JORNADAS.flatMap((j) => j.passos)],
    [],
  );
  const total = contarEstados(todos);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Programas e ações"
        title="Jornada do utilizador"
        description="Onde está cada Educador na Formação de Educadores Ubuntu, o que tem de acontecer a seguir e quem tem de agir."
      />
      <Tabs defaultValue="acompanhamento" className="space-y-5">
        <div className="min-w-0 overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="acompanhamento">Acompanhamento</TabsTrigger>
            <TabsTrigger value="ver-como">Ver como o utilizador</TabsTrigger>
            <TabsTrigger value="como-funciona">Como funciona</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="acompanhamento" className="space-y-5">
          <AcompanhamentoJornada />
        </TabsContent>
        <TabsContent value="ver-como" className="space-y-5">
          <VerComoUtilizador />
        </TabsContent>
        <TabsContent value="como-funciona" className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone="green">{total.funciona} a funcionar</StatusChip>
            <StatusChip tone="yellow">{total.parcial} em parte</StatusChip>
            <StatusChip tone="red">{total.falta} por fazer</StatusChip>
          </div>
          <Legenda />
          <Ciclo />
          <CalculadoraDatas />
          <JornadasPorTipo />
          <FluxoDetalhado />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function Ciclo() {
  return (
    <Section
      title="Ciclo do programa"
      description="Seis passos, com a FTP como âncora. O badge da FTC dá acesso à inscrição na FTP; a presença na FTP dá acesso à Semana Ubuntu."
    >
      <ol className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
        {CICLO.map((p, i) => (
          <li key={p.titulo} className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold tabular-nums text-secondary-foreground">
                {i + 1}
              </span>
              <p className="min-w-0 text-sm font-semibold text-secondary">{p.titulo}</p>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{p.detalhe}</p>
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
              <EstadoChip estado={p.estado} />
              <FaseTag fase={p.fase} />
            </div>
          </li>
        ))}
      </ol>
      <p className="rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground">
        Acesso à FTC e à Semana Ubuntu até ao fim do ano letivo; em agosto fecha, com aviso para descarregar os materiais.
      </p>
    </Section>
  );
}

function CalculadoraDatas() {
  const [ftp, setFtp] = useState(() => somarDias(hojeISO(), 30));
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(ftp);
  const j = valida ? janelaFtc(ftp) : null;
  const marcos = j
    ? [
        { quando: j.abertura, titulo: "A FTC abre", detalhe: "Os Educadores da escola entram na turma da FTC desta FTP." },
        { quando: j.fimConclusao, titulo: "Fim da 1.ª semana", detalhe: "Prazo para concluir a FTC e receber o badge." },
        { quando: j.inscricaoInicio, titulo: "Inscrição na FTP", detalhe: `Até ${formatarDataPt(j.inscricaoFim)}, só com o badge da FTC (Fase 2).` },
        { quando: j.ftp, titulo: "FTP", detalhe: `Turma de acreditação de ${FTP_MIN_EDUCADORES} a ${FTP_MAX_EDUCADORES} Educadores.` },
      ]
    : [];
  return (
    <Section
      title="Datas calculadas a partir da FTP"
      description={`Tudo se calcula a partir da data da FTP. A escola pode mudar de FTP até ao dia em que a FTC abre (${FTC_DIAS_ANTES_FTP} dias antes); depois disso só a equipa IPAV muda.`}
    >
      <FormField id="jornada-ftp" label="Experimenta com uma data de FTP" className="max-w-xs">
        <Input id="jornada-ftp" type="date" value={ftp} onChange={(e) => setFtp(e.target.value)} />
      </FormField>
      {j && (
        <ol className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
          {marcos.map((m, i) => (
            <li key={m.titulo} className="flex min-w-0 gap-3 rounded-lg border bg-card p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFEBDC] text-xs font-semibold text-[#A1420A]">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-secondary">{m.titulo}</p>
                <p className="text-sm tabular-nums">{formatarDataPt(m.quando, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.detalhe}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function PassoLinha({ passo, numero, ultimo }: { passo: PassoJornada; numero: number; ultimo: boolean }) {
  return (
    <li className="relative flex min-w-0 gap-4 pb-5 last:pb-0">
      {!ultimo && <span className="absolute left-[13px] top-8 bottom-0 w-px bg-border" aria-hidden="true" />}
      <span
        className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-card text-xs font-semibold tabular-nums ${
          passo.estado === "funciona"
            ? "border-[#11643F] text-[#11643F]"
            : passo.estado === "parcial"
              ? "border-[#B7791F] text-[#6B4200]"
              : "border-[#B42318] text-[#B42318]"
        }`}
      >
        {numero}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-secondary">{passo.titulo}</p>
          <EstadoChip estado={passo.estado} />
          <FaseTag fase={passo.fase} />
        </div>
        {passo.detalhe && <p className="text-sm leading-relaxed text-muted-foreground">{passo.detalhe}</p>}
        {passo.onde && (
          <Link
            to={passo.onde.to}
            className="inline-flex items-center gap-1 text-xs font-medium text-secondary underline-offset-4 hover:text-primary hover:underline"
          >
            {passo.onde.label}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>
    </li>
  );
}

function JornadasPorTipo() {
  return (
    <Section
      title="Jornada de cada pessoa"
      description="Cada tipo de utilizador e o seu percurso, por ordem. O mesmo utilizador pode estar na formação e em ações isoladas."
    >
      <Tabs defaultValue={JORNADAS[0].id} className="space-y-4">
        <div className="min-w-0 overflow-x-auto">
          <TabsList className="w-max">
            {JORNADAS.map((j) => (
              <TabsTrigger key={j.id} value={j.id}>
                {j.nome}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {JORNADAS.map((j) => {
          const c = contarEstados(j.passos);
          return (
            <TabsContent key={j.id} value={j.id} className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-muted/40 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-secondary">
                    {j.nome} <span className="font-normal text-muted-foreground">· {j.tipo}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{j.resumo}</p>
                </div>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {c.funciona} a funcionar · {c.parcial} em parte · {c.falta} por fazer
                </p>
              </div>
              <ol>
                {j.passos.map((p, i) => (
                  <PassoLinha key={p.titulo} passo={p} numero={i + 1} ultimo={i === j.passos.length - 1} />
                ))}
              </ol>
            </TabsContent>
          );
        })}
      </Tabs>
    </Section>
  );
}

function FluxoDetalhado() {
  const [modo, setModo] = useState<"simples" | "detalhada">("simples");
  return (
    <Section
      title="Fluxo da formação"
      description={
        modo === "simples"
          ? "Quem faz o quê em cada fase, em resumo. A coluna Plataforma é o que acontece sozinho."
          : "Todos os passos, por ordem, com o que leva a cada um e as decisões pelo caminho."
      }
      actions={
        <div role="group" aria-label="Versão do fluxo" className="inline-flex rounded-md border p-0.5">
          {(["simples", "detalhada"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={modo === m}
              onClick={() => setModo(m)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                modo === m ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-secondary"
              }`}
            >
              {m === "simples" ? "Versão simples" : "Versão detalhada"}
            </button>
          ))}
        </div>
      }
    >
      {modo === "simples" ? <FluxoSimples /> : <FluxoCompleto />}
    </Section>
  );
}

function CabecalhoRaias() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {RAIAS.map((r) => (
        <p key={r} className="rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">
          {r}
        </p>
      ))}
    </div>
  );
}

function FluxoSimples() {
  return (
    <div className="min-w-0 overflow-x-auto">
      <div className="min-w-[760px] space-y-4">
        <CabecalhoRaias />
        {FLUXO.map((f) => (
          <div key={f.id} className="space-y-3">
            <p className="rounded-md bg-muted px-3 py-2 text-xs font-semibold text-secondary">{f.titulo}</p>
            <div className="grid grid-cols-4 gap-3">
              {RAIAS.map((r) => (
                <div key={r} className="space-y-2">
                  {(f.passos[r] ?? []).map((p) => (
                    <CartaoPasso key={p.titulo} p={p} />
                  ))}
                </div>
              ))}
            </div>
            {f.decisao && (
              <p className="flex items-start gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-secondary">
                <span aria-hidden="true">◇</span>
                <span>
                  <strong className="font-semibold">Decisão:</strong> {f.decisao}
                </span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CartaoPasso({ p, numero, ligacoes }: { p: PassoJornada; numero?: number; ligacoes?: string[] }) {
  return (
    <div className="space-y-1.5 rounded-md border bg-card p-3">
      {ligacoes && ligacoes.length > 0 && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {ligacoes.map((l, i) => (
            <span key={i} className="block">
              ↳ {l}
            </span>
          ))}
        </p>
      )}
      <p className="text-xs font-medium leading-snug text-secondary">
        {numero != null && <span className="mr-1 tabular-nums text-muted-foreground">{numero}.</span>}
        {p.titulo}
      </p>
      {p.detalhe && <p className="text-[11px] leading-snug text-muted-foreground">{p.detalhe}</p>}
      <div className="flex flex-wrap gap-1">
        <StatusChip tone={TOM[p.estado]} className="h-5 px-2 text-[11px]">
          {ESTADO_LABEL[p.estado]}
        </StatusChip>
        {p.fase && (
          <StatusChip tone="tag" className="h-5 px-2 text-[11px] font-normal">
            Fase {p.fase}
          </StatusChip>
        )}
      </div>
    </div>
  );
}

function FluxoCompleto() {
  let n = 0;
  return (
    <div className="min-w-0 overflow-x-auto">
      <div className="min-w-[760px] space-y-4">
        <CabecalhoRaias />
        {FLUXO_DETALHADO.map((f) => (
          <div key={f.id} className="space-y-2">
            <p className="rounded-md bg-muted px-3 py-2 text-xs font-semibold text-secondary">{f.titulo}</p>
            {f.itens.map((item) => {
              if (eDecisao(item)) {
                return (
                  <div key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-dashed px-3 py-2 text-xs text-secondary">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <span aria-hidden="true">◇</span>
                      {item.pergunta}
                    </span>
                    <span>
                      <strong className="font-semibold text-[#11643F]">Sim</strong> → {tituloFluxo(item.sim.id)}
                    </span>
                    <span>
                      <strong className="font-semibold text-[#B42318]">Não</strong> → {tituloFluxo(item.nao.id)}
                    </span>
                  </div>
                );
              }
              n += 1;
              const col = RAIAS.indexOf(item.raia);
              const ligacoes = (item.depoisDe ?? [])
                .filter((d) => !d.id.startsWith("d-"))
                .map((d) => `${d.rotulo ? `${d.rotulo} · ` : "depois de "}${tituloFluxo(d.id)}`);
              return (
                <div key={item.id} className="grid grid-cols-4 gap-3">
                  <div style={{ gridColumnStart: col + 1 }}>
                    <CartaoPasso p={item} numero={n} ligacoes={ligacoes} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
