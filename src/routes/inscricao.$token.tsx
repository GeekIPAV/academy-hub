import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCohortByToken, enrollWithToken } from "@/lib/inscricao.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/inscricao/$token")({
  head: () => ({ meta: [{ title: "Inscrição — Academia Ubuntu" }] }),
  component: InscricaoPage,
});

function InscricaoPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const fetchCohort = useServerFn(getCohortByToken);
  const enroll = useServerFn(enrollWithToken);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { already: boolean }>(null);

  const { data: cohort, isLoading } = useQuery({
    queryKey: ["cohort-by-token", token],
    queryFn: () => fetchCohort({ data: { token } }),
  });

  const handleEnroll = async () => {
    setSubmitting(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      navigate({
        to: "/auth",
        search: { redirect: `/inscricao/${token}` },
      });
      return;
    }
    try {
      const res = await enroll({ data: { token } });
      setDone({ already: !!res.alreadyEnrolled });
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

  // Auto-enroll após login se vier do redirect
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session || !cohort || done || submitting) return;
      handleEnroll();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohort, done, submitting]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Inscrição em programa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
          {!isLoading && !cohort && (
            <p className="text-sm text-destructive">
              Link inválido ou expirado.
            </p>
          )}
          {cohort && (
            <>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Entidade</p>
                <p className="font-medium">{cohort.entity_name ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Programa</p>
                <p className="font-medium">{cohort.program_title ?? "—"}</p>
              </div>
              {done ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    {done.already
                      ? "Já estavas inscrito."
                      : "Inscrição submetida. Aguarda validação."}
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/dashboard">Ir para o dashboard</Link>
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleEnroll}
                  disabled={submitting || cohort.is_active === false}
                >
                  {submitting ? "A submeter…" : "Inscrever-me"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
