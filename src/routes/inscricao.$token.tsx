import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCohortByToken, enrollWithToken } from "@/lib/inscricao.functions";
import { getMeuPerfilCertificacao, isCertCompleto } from "@/lib/certificacao-perfil.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CertificacaoForm } from "@/components/CertificacaoForm";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import aluLogo from "@/assets/alu-logo.svg";

function PublicShell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="flex items-center justify-between gap-4 bg-secondary px-[5%] py-3">
        <img src={aluLogo} alt="Academia de Líderes Ubuntu" className="h-10 w-auto" />
        {right}
      </header>
      <main className="px-4 py-8 sm:px-[5%] sm:py-10">{children}</main>
    </div>
  );
}

const PASSOS = [
  { id: "pdf", label: "Documento informativo" },
  { id: "form", label: "Dados de certificação" },
  { id: "confirm", label: "Confirmar" },
] as const;

export const Route = createFileRoute("/inscricao/$token")({
  head: () => ({ meta: [{ title: "Inscrição | Academia de Líderes Ubuntu" }] }),
  component: InscricaoPage,
});

type Step = "pdf" | "form" | "confirm" | "done";

function InscricaoPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchCohort = useServerFn(getCohortByToken);
  const fetchPerfil = useServerFn(getMeuPerfilCertificacao);
  const enroll = useServerFn(enrollWithToken);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("pdf");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { already: boolean }>(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [leu, setLeu] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: cohort, isLoading } = useQuery({
    queryKey: ["cohort-by-token", token],
    queryFn: () => fetchCohort({ data: { token } }),
  });

  const { data: perfil, isFetched: perfilFetched } = useQuery({
    queryKey: ["meu-perfil-certificacao"],
    queryFn: () => fetchPerfil(),
    enabled: authed === true,
  });

  // Só é seguro decidir depois de o perfil ter sido efetivamente carregado.
  const certCompleto = perfilFetched && isCertCompleto(perfil ?? null);

  // Sempre que o link é aberto, começa no primeiro passo aplicável.
  useEffect(() => {
    if (!cohort) return;
    setStep(cohort.info_pdf_url ? "pdf" : "form");
  }, [cohort]);

  // Deteta o fim do documento com um sentinela no fim do scroller.
  // Se o conteúdo não chegar a ter scroll, o sentinela já está visível
  // e o botão fica ativo de imediato.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (step !== "pdf") return;
    const root = scrollerRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;

    const check = () => {
      if (root.scrollHeight - root.clientHeight <= 24) setScrolledToEnd(true);
    };
    check();

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setScrolledToEnd(true);
      },
      { root, threshold: 0.01 },
    );
    io.observe(target);

    const ro = new ResizeObserver(check);
    ro.observe(root);

    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, [step, cohort?.info_pdf_url]);


  const goAfterPdf = () => {
    setStep(certCompleto ? "confirm" : "form");
  };

  const handleEnroll = async () => {
    if (!certCompleto) {
      setStep("form");
      toast.error("Preenche os dados de certificação antes de te inscreveres.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await enroll({ data: { token } });
      setDone({ already: !!res.alreadyEnrolled });
      setStep("done");
      toast.success(
        res.alreadyEnrolled
          ? "Já estavas inscrito neste programa."
          : "Inscrição registada com sucesso!",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na inscrição.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">A carregar…</p>
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Link inválido ou expirado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{cohort.program_title ?? "Inscrição em programa"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Inicia sessão (ou cria conta) para continuares a inscrição.
            </p>
            <Button
              className="w-full"
              onClick={() =>
                navigate({ to: "/auth", search: { redirect: `/inscricao/${token}` } })
              }
            >
              Entrar / Registar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const passos = cohort.info_pdf_url ? PASSOS : PASSOS.filter((p) => p.id !== "pdf");
  const atual = step === "done" ? passos.length : passos.findIndex((p) => p.id === step);

  return (
    <PublicShell
      right={
        <Link to="/dashboard" className="text-sm font-medium text-white hover:text-white/80">
          <X className="mr-1 inline h-4 w-4" aria-hidden="true" />
          Sair
        </Link>
      }
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Inscrição no programa</p>
          <h1 className="text-2xl font-semibold tracking-tight text-secondary sm:text-[28px]">
            {cohort.program_title ?? "Programa"}
          </h1>
        </div>

        {step !== "done" && (
          <ol className="flex flex-wrap gap-x-2 gap-y-3" aria-label="Passos da inscrição">
            {passos.map((p, i) => {
              const feito = i < atual;
              const agora = i === atual;
              return (
                <li
                  key={p.id}
                  aria-current={agora ? "step" : undefined}
                  className={`flex flex-1 basis-40 items-center gap-2.5 text-sm font-medium ${agora ? "text-secondary" : "text-muted-foreground"}`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      agora ? "bg-primary text-white" : feito ? "bg-secondary text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {p.label}
                  {i < passos.length - 1 && <span className="hidden h-0.5 min-w-4 flex-1 bg-border sm:block" />}
                </li>
              );
            })}
          </ol>
        )}

        {step === "pdf" && (
          <>
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-secondary">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Documento informativo
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Explica o programa. Lê até ao fim para continuares.
                  </p>
                </div>
                {cohort.info_pdf_url && (
                  <Button asChild size="sm" variant="outline">
                    <a href={cohort.info_pdf_url} download target="_blank" rel="noreferrer">
                      <Download className="mr-1.5 h-4 w-4" /> Descarregar PDF
                    </a>
                  </Button>
                )}
              </div>
              <div ref={scrollerRef} className="max-h-[62dvh] overflow-y-auto bg-muted/50 p-3 sm:p-5">
                {cohort.info_pdf_url ? (
                  <iframe
                    src={`${cohort.info_pdf_url}#toolbar=0&view=FitH`}
                    className="h-[55dvh] min-h-[240px] w-full rounded-md border bg-white sm:h-[60vh]"
                    title="Documento informativo do programa"
                  />
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Sem documento informativo para este programa.
                  </div>
                )}
                <div ref={sentinelRef} className="h-2" />
              </div>
              <div className="space-y-3 border-t px-5 py-4">
                {scrolledToEnd ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[#11643F]">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Chegaste ao fim do documento.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Faz scroll até ao fim do documento para continuares.</p>
                )}
                <label className={`flex items-center gap-2.5 text-sm font-medium ${scrolledToEnd ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                  <Checkbox checked={leu} disabled={!scrolledToEnd} onCheckedChange={(v) => setLeu(v === true)} />
                  Li e percebi o documento informativo
                </label>
              </div>
            </section>
            <div className="flex flex-wrap justify-between gap-3">
              <Button asChild variant="ghost">
                <Link to="/dashboard">Sair da inscrição</Link>
              </Button>
              <Button onClick={goAfterPdf} disabled={!scrolledToEnd || !leu || !perfilFetched} className="h-11 px-5">
                Continuar
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === "form" && (
          <CertificacaoForm
            onCancel={cohort.info_pdf_url ? () => setStep("pdf") : undefined}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["meu-perfil-certificacao"] });
              setStep("confirm");
            }}
          />
        )}

        {step === "confirm" && (
          <section className="space-y-5 rounded-xl border bg-card p-6">
            <div>
              <h2 className="text-base font-semibold text-secondary">Confirmar inscrição</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Vais inscrever-te no programa <strong className="font-semibold text-secondary">{cohort.program_title}</strong>.
                Os teus dados de certificação já estão guardados.
              </p>
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep("form")}>
                Rever dados
              </Button>
              <Button onClick={handleEnroll} disabled={submitting || !certCompleto} className="h-11 px-5">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar inscrição
              </Button>
            </div>
          </section>
        )}

        {step === "done" && (
          <section className="flex flex-col items-center gap-3 rounded-xl border bg-card p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
            <p className="text-lg font-semibold text-secondary">
              {done?.already ? "Já estavas inscrito neste programa." : "Inscrição feita."}
            </p>
            <Button asChild className="mt-2">
              <Link to="/dashboard">Ir para a página inicial</Link>
            </Button>
          </section>
        )}
      </div>
    </PublicShell>
  );
}
