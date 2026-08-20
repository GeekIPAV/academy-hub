import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Loader2, Search } from "lucide-react";
import {
  getProgramaByPublicToken,
  searchEntidadesPublic,
  checkEntidadeAtiva,
  submitEntidadeApplication,
} from "@/lib/equipa-programas.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/inscricao-entidade/$token")({
  head: () => ({
    meta: [
      { title: "Inscrição de organização — Academia Ubuntu" },
      {
        name: "description",
        content:
          "Inscreve a tua organização num programa da Academia de Líderes Ubuntu.",
      },
      { property: "og:title", content: "Inscrição de organização — Academia Ubuntu" },
      {
        property: "og:description",
        content: "Inscreve a tua organização num programa da Academia de Líderes Ubuntu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InscricaoEntidadePage,
});

type Step = "search" | "form" | "blocked" | "done";

function InscricaoEntidadePage() {
  const { token } = Route.useParams();
  const fetchProg = useServerFn(getProgramaByPublicToken);
  const searchFn = useServerFn(searchEntidadesPublic);
  const checkFn = useServerFn(checkEntidadeAtiva);
  const submitFn = useServerFn(submitEntidadeApplication);

  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    postal_code: "",
    locality: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
  });

  const { data: programa, isLoading } = useQuery({
    queryKey: ["public-programa", token],
    queryFn: () => fetchProg({ data: { token } }),
  });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["public-entidades", token, debounced],
    queryFn: () => searchFn({ data: { token, query: debounced } }),
    enabled: debounced.length >= 3,
  });

  const pick = async (e: { id: string; name: string }) => {
    const res = await checkFn({ data: { token, entity_id: e.id } });
    if (res.ativa) {
      setSelected(e);
      setStep("blocked");
      return;
    }
    setSelected(e);
    setForm((f) => ({ ...f, name: e.name }));
    setStep("form");
  };

  const startNew = () => {
    setSelected(null);
    setForm((f) => ({ ...f, name: query.trim() }));
    setStep("form");
  };

  const submit = async () => {
    if (!form.name.trim() || !form.contact_name.trim() || !form.contact_email.trim()) {
      toast.error("Preenche o nome da organização e os dados da pessoa de contacto.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFn({
        data: {
          token,
          entity_id: selected?.id ?? null,
          name: form.name.trim(),
          address: form.address.trim() || null,
          postal_code: form.postal_code.trim() || null,
          locality: form.locality.trim() || null,
          contact_name: form.contact_name.trim(),
          contact_email: form.contact_email.trim(),
          contact_phone: form.contact_phone.trim() || null,
        },
      });
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao submeter o pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!programa) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Link inválido ou expirado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Inscrição de organização
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{programa.title}</h1>
            {programa.cluster_name && (
              <p className="text-sm text-muted-foreground">{programa.cluster_name}</p>
            )}
          </div>
        </div>

        {!programa.enrollment_open && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                As inscrições para este programa estão fechadas de momento.
              </p>
            </CardContent>
          </Card>
        )}

        {programa.enrollment_open && step === "search" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qual é a vossa organização?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Escreve o nome da organização…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {debounced.length >= 3 && (
                <div className="space-y-2">
                  {isFetching && (
                    <p className="text-xs text-muted-foreground">A pesquisar…</p>
                  )}
                  {(results ?? []).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => pick(e)}
                      className="w-full rounded-md border p-3 text-left text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{e.name}</span>
                      {e.locality && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {e.locality}
                        </span>
                      )}
                    </button>
                  ))}
                  <Button variant="outline" className="w-full" onClick={startNew}>
                    Não encontro a minha organização — registar nova
                  </Button>
                </div>
              )}
              {debounced.length > 0 && debounced.length < 3 && (
                <p className="text-xs text-muted-foreground">
                  Escreve pelo menos 3 caracteres.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {step === "blocked" && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm">
                A organização <strong>{selected?.name}</strong> já está registada na
                plataforma. Façam a inscrição a partir da página da organização.
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <a href="/auth">Entrar na plataforma</a>
                </Button>
                <Button variant="ghost" onClick={() => setStep("search")}>
                  Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selected ? "Confirmar dados da organização" : "Registar organização"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Nome da organização"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                disabled={!!selected}
              />
              <Field
                label="Morada"
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Código postal"
                  placeholder="1234-567"
                  value={form.postal_code}
                  onChange={(v) => setForm({ ...form, postal_code: v })}
                />
                <Field
                  label="Localidade"
                  value={form.locality}
                  onChange={(v) => setForm({ ...form, locality: v })}
                />
              </div>

              <div className="pt-2">
                <p className="text-sm font-medium">Pessoa de contacto</p>
              </div>
              <Field
                label="Nome"
                value={form.contact_name}
                onChange={(v) => setForm({ ...form, contact_name: v })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Email"
                  type="email"
                  value={form.contact_email}
                  onChange={(v) => setForm({ ...form, contact_email: v })}
                />
                <Field
                  label="Telemóvel"
                  value={form.contact_phone}
                  onChange={(v) => setForm({ ...form, contact_phone: v })}
                />
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="ghost" onClick={() => setStep("search")}>
                  Voltar
                </Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submeter pedido
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card>
            <CardContent className="space-y-3 pt-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <p className="font-medium">Pedido enviado</p>
              <p className="text-sm text-muted-foreground">
                A equipa da Academia Ubuntu vai rever a inscrição e entrar em contacto
                por email com os próximos passos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
