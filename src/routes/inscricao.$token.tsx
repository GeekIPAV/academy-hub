import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/inscricao/$token")({
  head: () => ({ meta: [{ title: "Inscrição — Academia Ubuntu" }] }),
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

  const { data: perfil } = useQuery({
    queryKey: ["meu-perfil-certificacao"],
    queryFn: () => fetchPerfil(),
    enabled: authed === true,
  });

  // Decide step inicial uma vez carregado tudo
  useEffect(() => {
    if (!cohort || authed !== true) return;
    if (!cohort.info_pdf_url) {
      setScrolledToEnd(true);
      setStep(isCertCompleto(perfil ?? null) ? "confirm" : "form");
    } else if (step === "pdf" && isCertCompleto(perfil ?? null) && scrolledToEnd) {
      // permanece no PDF até confirmar
    }
  }, [cohort, authed, perfil]); // eslint-disable-line

  const onScrollPdf = () => {
    const el = scrollerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledToEnd(true);
  };

  const goAfterPdf = () => {
    setStep(isCertCompleto(perfil ?? null) ? "confirm" : "form");
  };

  const handleEnroll = async () => {
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

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <Card className="flex flex-col max-h-[92vh]">
          <CardHeader className="border-b">
            <CardTitle>{cohort.program_title ?? "Programa"}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {step === "pdf" && "1 de 3 · Documento informativo"}
              {step === "form" && "2 de 3 · Dados de certificação"}
              {step === "confirm" && "3 de 3 · Confirmar inscrição"}
            </p>
          </CardHeader>

          {step === "pdf" && (
            <>
              <div
                ref={scrollerRef}
                onScroll={onScrollPdf}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {cohort.info_pdf_url ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        Documento informativo
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <a href={cohort.info_pdf_url} download target="_blank" rel="noreferrer">
                          <Download className="mr-1 h-4 w-4" /> Descarregar
                        </a>
                      </Button>
                    </div>
                    <iframe
                      src={`${cohort.info_pdf_url}#toolbar=0&view=FitH`}
                      className="w-full h-[60vh] rounded-md border bg-muted"
                      title="PDF do programa"
                    />
                    <p className="text-xs text-muted-foreground">
                      Faz scroll até ao fim do documento para continuares.
                    </p>
                  </>
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-sm text-center text-muted-foreground">
                    Sem documento informativo para este programa.
                  </div>
                )}
                <div className="h-2" />
              </div>
              <div className="border-t p-4 flex justify-end">
                <Button onClick={goAfterPdf} disabled={!scrolledToEnd}>
                  Li e percebi — continuar
                </Button>
              </div>
            </>
          )}

          {step === "form" && (
            <div className="flex-1 overflow-y-auto p-4">
              <CertificacaoForm
                onCancel={cohort.info_pdf_url ? () => setStep("pdf") : undefined}
                onSaved={() => {
                  qc.invalidateQueries({ queryKey: ["meu-perfil-certificacao"] });
                  setStep("confirm");
                }}
              />
            </div>
          )}

          {step === "confirm" && (
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm">
                Vais inscrever-te no programa <strong>{cohort.program_title}</strong>.
              </p>
              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep("form")}>
                  Editar dados
                </Button>
                <Button onClick={handleEnroll} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar inscrição
                </Button>
              </div>
            </CardContent>
          )}

          {step === "done" && (
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm">
                {done?.already
                  ? "Já estavas inscrito neste programa."
                  : "Inscrição submetida com sucesso!"}
              </p>
              <Button asChild className="w-full">
                <Link to="/dashboard">Ir para o dashboard</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
