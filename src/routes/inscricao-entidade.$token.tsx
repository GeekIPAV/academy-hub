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
import aluLogo from "@/assets/alu-logo.svg";
import { FormField, fieldErrorClass } from "@/components/shell/FormField";

export const Route = createFileRoute("/inscricao-entidade/$token")({
  validateSearch: (s: Record<string, unknown>): { p?: string } =>
    typeof s.p === "string" ? { p: s.p } : {},
  head: () => ({
    meta: [
      { title: "Inscrição de organização | Academia de Líderes Ubuntu" },
      {
        name: "description",
        content:
          "Inscreve a tua organização num programa da Academia de Líderes Ubuntu.",
      },
      { property: "og:title", content: "Inscrição de organização | Academia de Líderes Ubuntu" },
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
  const { p: projeto } = Route.useSearch();
  const fetchProg = useServerFn(getProgramaByPublicToken);
  const searchFn = useServerFn(searchEntidadesPublic);
  const checkFn = useServerFn(checkEntidadeAtiva);
  const submitFn = useServerFn(submitEntidadeApplication);

  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tentou, setTentou] = useState(false);
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
    setTentou(true);
    if (
      !form.name.trim() ||
      !form.contact_name.trim() ||
      !/^\S+@\S+\.\S+$/.test(form.contact_email.trim()) ||
      (form.postal_code.trim() !== "" && !/^\d{4}-\d{3}$/.test(form.postal_code.trim()))
    ) {
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
          projeto: projeto ?? null,
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

  const passoAtual = step === "search" || step === "blocked" ? 0 : step === "form" ? 1 : 2;
  const erroEmail =
    tentou && !/^\S+@\S+\.\S+$/.test(form.contact_email.trim())
      ? form.contact_email.trim()
        ? "Confirma o email, falta algum carácter."
        : "Preenche o email."
      : null;
  const erroCp =
    tentou && form.postal_code.trim() !== "" && !/^\d{4}-\d{3}$/.test(form.postal_code.trim())
      ? "Escreve o código postal completo, por exemplo 1000-001."
      : null;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="flex items-center justify-between gap-4 bg-secondary px-[5%] py-3">
        <img src={aluLogo} alt="Academia de Líderes Ubuntu" className="h-10 w-auto" />
        <a href="/auth" className="text-sm font-medium text-white hover:text-white/80">
          Já tenho conta
        </a>
      </header>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:py-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Inscrição de organização</p>
          <h1 className="text-2xl font-semibold tracking-tight text-secondary sm:text-[28px]">{programa.title}</h1>
          {programa.cluster_name && <p className="mt-1 text-sm text-muted-foreground">{programa.cluster_name}</p>}
        </div>
        {programa.enrollment_open && (
          <ol className="flex flex-wrap gap-x-2 gap-y-3" aria-label="Passos do registo">
            {["Procurar", "Dados", "Pedido enviado"].map((l, i) => (
              <li
                key={l}
                aria-current={i === passoAtual ? "step" : undefined}
                className={`flex flex-1 basis-32 items-center gap-2.5 text-sm font-medium ${i === passoAtual ? "text-secondary" : "text-muted-foreground"}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    i === passoAtual ? "bg-primary text-white" : i < passoAtual ? "bg-secondary text-white" : "bg-muted"
                  }`}
                >
                  {i + 1}
                </span>
                {l}
                {i < 2 && <span className="hidden h-0.5 min-w-4 flex-1 bg-border sm:block" />}
              </li>
            ))}
          </ol>
        )}

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
              <CardTitle className="text-base text-secondary">A tua organização já está na plataforma?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Escreve o nome da organização"
                  aria-label="Nome da organização"
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
                      className="w-full rounded-xl border p-3 text-left text-sm hover:border-secondary/40"
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
                    Não encontro a minha organização: registar nova
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
                plataforma. A inscrição faz-se a partir da página da organização, por quem já tem conta.
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
              <CardTitle className="text-base text-secondary">
                {selected ? "Confirma os dados da organização" : "Dados da organização"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                id="org-nome"
                label="Nome da organização"
                required
                error={tentou && !form.name.trim() ? "Preenche o nome da organização." : null}
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                disabled={!!selected}
              />
              <Field
                id="org-morada"
                label="Morada"
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="org-cp"
                  label="Código postal"
                  error={erroCp}
                  placeholder="1234-567"
                  value={form.postal_code}
                  onChange={(v) => setForm({ ...form, postal_code: v })}
                />
                <Field
                  id="org-localidade"
                  label="Localidade"
                  value={form.locality}
                  onChange={(v) => setForm({ ...form, locality: v })}
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-[15px] font-semibold text-secondary">Pessoa de contacto</p>
                <p className="text-xs text-muted-foreground">Recebe a resposta ao pedido e fica responsável pela organização na plataforma.</p>
              </div>
              <Field
                id="org-contacto"
                label="Nome"
                required
                error={tentou && !form.contact_name.trim() ? "Preenche o nome da pessoa de contacto." : null}
                value={form.contact_name}
                onChange={(v) => setForm({ ...form, contact_name: v })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="org-email"
                  label="Email"
                  required
                  error={erroEmail}
                  type="email"
                  value={form.contact_email}
                  onChange={(v) => setForm({ ...form, contact_email: v })}
                />
                <Field
                  id="org-telemovel"
                  label="Telemóvel"
                  type="tel"
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
                  Enviar pedido
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
                A equipa da Academia vai rever o pedido e responder por email com os próximos passos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  required,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
}) {
  return (
    <FormField id={id} label={label} required={required} error={error}>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erro` : undefined}
        className={error ? fieldErrorClass : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  );
}
