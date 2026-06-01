import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Loader2,
  Check,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import aluLogo from "@/assets/alu-logo.svg";
import {
  getPublicEventDetails,
  verifyPublicUserIdentity,
  enrollInPublicEventForUser,
  type RequiredField,
} from "@/lib/public-event.functions";

export const Route = createFileRoute("/evento/$id")({
  head: () => ({ meta: [{ title: "Inscrição em evento — Academia Ubuntu" }] }),
  component: PublicEventPage,
});

type DocType = "nif" | "passport";
type IdentityState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "existing"; full_name: string | null }
  | { status: "new" }
  | { status: "conflict"; message: string };

function PublicEventPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchEvent = useServerFn(getPublicEventDetails);
  const verifyFn = useServerFn(verifyPublicUserIdentity);
  const enrollFn = useServerFn(enrollInPublicEventForUser);

  const event = useQuery({
    queryKey: ["public-event", id],
    queryFn: () => fetchEvent({ data: { identifier: id } }),
    retry: false,
  });

  // ---------- Form state ----------
  const [email, setEmail] = useState("");
  const [docType, setDocType] = useState<DocType>("nif");
  const [docNumber, setDocNumber] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [obs, setObs] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [identity, setIdentity] = useState<IdentityState>({ status: "idle" });

  const canVerify =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    docNumber.trim().length >= 3;

  const triggerVerify = async () => {
    if (!canVerify) return;
    setIdentity({ status: "checking" });
    try {
      const res = await verifyFn({
        data: {
          email: email.trim().toLowerCase(),
          doc_type: docType,
          doc_number: docNumber.trim(),
        },
      });
      if (res.conflict) {
        setIdentity({
          status: "conflict",
          message:
            "O email indicado não corresponde ao documento. Verifica os dados.",
        });
      } else if (res.exists) {
        setIdentity({ status: "existing", full_name: res.full_name });
      } else {
        setIdentity({ status: "new" });
      }
    } catch (e) {
      setIdentity({
        status: "conflict",
        message: (e as Error).message ?? "Erro ao verificar identidade.",
      });
    }
  };

  // Reset identidade se o utilizador mudar email/doc após verificação.
  useEffect(() => {
    if (identity.status !== "idle" && identity.status !== "checking") {
      setIdentity({ status: "idle" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, docType, docNumber]);

  const submitting = useMutation({
    mutationFn: async () => {
      if (identity.status !== "existing" && identity.status !== "new") {
        throw new Error("Confirma primeiro o teu email e documento.");
      }

      // 1. Auth no cliente.
      let userId: string;
      if (identity.status === "existing") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw new Error(error.message);
        userId = data.user!.id;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw new Error(error.message);
        if (!data.user) {
          throw new Error(
            "Não foi possível criar a conta. Tenta novamente.",
          );
        }
        userId = data.user.id;
      }

      // 2. Inscrição (admin no servidor — não depende de sessão hidratada).
      return enrollFn({
        data: {
          identifier: id,
          user_id: userId,
          email: email.trim().toLowerCase(),
          additional_data: answers,
          user_observations: obs || undefined,
          profile:
            identity.status === "new"
              ? {
                  full_name: fullName.trim(),
                  doc_type: docType,
                  doc_number: docNumber.trim(),
                }
              : undefined,
        },
      });
    },
    onSuccess: (res) => {
      if (res.alreadyEnrolled) {
        toast.info("Já estavas inscrito neste evento.");
      } else if (res.status === "aceite") {
        toast.success("Inscrição confirmada!");
      } else {
        toast.success("Estás em lista de espera (suplente).");
      }
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fields: RequiredField[] = useMemo(
    () => event.data?.required_fields ?? [],
    [event.data?.required_fields],
  );

  const closed =
    event.data?.registration_status != null &&
    event.data.registration_status !== "Aberto";
  const isFull =
    event.data?.max_capacity != null &&
    event.data.aceite_count >= event.data.max_capacity;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-muted/10 px-4 py-10">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
        <img
          src={aluLogo}
          alt="Academia de Líderes Ubuntu"
          className="h-12 w-auto"
        />

        {event.isLoading ? (
          <Card className="w-full shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-2/3" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : event.isError || !event.data ? (
          <Card className="w-full shadow-lg">
            <CardContent className="space-y-3 py-10 text-center">
              <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
              <p className="font-medium">
                Não foi possível carregar este evento
              </p>
              <p className="text-sm text-muted-foreground">
                {(event.error as Error)?.message ?? "Link inválido."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full border-0 bg-background shadow-xl">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">{event.data.title}</CardTitle>
              {event.data.action_date && (
                <CardDescription className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {event.data.action_date}
                </CardDescription>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant={closed ? "secondary" : "default"}>
                  {event.data.registration_status ?? "Aberto"}
                </Badge>
                {event.data.max_capacity != null && (
                  <Badge variant={isFull ? "secondary" : "outline"}>
                    {event.data.aceite_count} / {event.data.max_capacity}{" "}
                    inscritos
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {event.data.description && (
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {event.data.description}
                </p>
              )}

              {closed ? (
                <p className="rounded-md bg-muted p-3 text-sm">
                  As inscrições para este evento não estão abertas.
                </p>
              ) : (
                <form
                  className="space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitting.mutate();
                  }}
                >
                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={triggerVerify}
                    />
                  </div>

                  {/* NIF / Passaporte */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="doc">
                        {docType === "nif"
                          ? "NIF"
                          : "Passaporte / Documento de identificação"}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Não tenho NIF / Estrangeiro
                        </span>
                        <Switch
                          checked={docType === "passport"}
                          onCheckedChange={(v) =>
                            setDocType(v ? "passport" : "nif")
                          }
                        />
                      </div>
                    </div>
                    <Input
                      id="doc"
                      required
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      onBlur={triggerVerify}
                      inputMode={docType === "nif" ? "numeric" : "text"}
                    />
                  </div>

                  {identity.status === "checking" && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />A verificar
                      identidade…
                    </p>
                  )}
                  {identity.status === "conflict" && (
                    <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {identity.message}
                    </p>
                  )}

                  {/* Expansão dinâmica */}
                  {identity.status === "existing" && (
                    <div className="space-y-5 border-t pt-5 duration-300 animate-in fade-in slide-in-from-top-2">
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Bem-vindo de volta
                        {identity.full_name ? `, ${identity.full_name}` : ""}.
                        Confirma a tua password para te inscreveres.
                      </p>
                      <div className="space-y-1.5">
                        <Label htmlFor="pwd">Password</Label>
                        <Input
                          id="pwd"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <DynamicQuestions
                        fields={fields}
                        values={answers}
                        setValues={setAnswers}
                      />
                    </div>
                  )}

                  {identity.status === "new" && (
                    <div className="space-y-5 border-t pt-5 duration-300 animate-in fade-in slide-in-from-top-2">
                      <p className="text-sm text-muted-foreground">
                        Vamos criar a tua conta para finalizar a inscrição.
                      </p>
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Nome completo</Label>
                        <Input
                          id="name"
                          required
                          autoComplete="name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="newpwd">Cria uma password</Label>
                        <Input
                          id="newpwd"
                          type="password"
                          autoComplete="new-password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <DynamicQuestions
                        fields={fields}
                        values={answers}
                        setValues={setAnswers}
                      />
                    </div>
                  )}

                  {(identity.status === "existing" ||
                    identity.status === "new") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="obs">Observações (opcional)</Label>
                      <Textarea
                        id="obs"
                        value={obs}
                        onChange={(e) => setObs(e.target.value)}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={
                      submitting.isPending ||
                      (identity.status !== "existing" &&
                        identity.status !== "new")
                    }
                  >
                    {submitting.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A submeter…
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {isFull
                          ? "Inscrever (lista de espera)"
                          : "Confirmar Inscrição"}
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">
          © Academia de Líderes Ubuntu
        </p>
      </div>
    </div>
  );
}

function DynamicQuestions({
  fields,
  values,
  setValues,
}: {
  fields: RequiredField[];
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  if (!fields.length) return null;
  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const key = f.name;
        const label = f.label ?? f.name;
        const type = (f.type ?? "text") as string;
        return (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>
              {label}
              {f.required && <span className="text-destructive"> *</span>}
            </Label>
            {type === "textarea" ? (
              <Textarea
                id={key}
                required={f.required}
                value={values[key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
              />
            ) : (
              <Input
                id={key}
                type={type}
                required={f.required}
                value={values[key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
