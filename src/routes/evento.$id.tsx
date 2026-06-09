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
import { lovable } from "@/integrations/lovable";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

interface PageBlock {
  id: string;
  type: "richtext" | "image";
  content?: unknown;
  url?: string;
  alt?: string;
}
interface PageBackground {
  type: "color" | "image";
  value: string;
  opacity?: number;
}
interface PageDoc {
  blocks: PageBlock[];
  title?: string;
  background?: PageBackground;
}
function parsePageDoc(v: unknown): PageDoc | null {
  if (!v || typeof v !== "object") return null;
  const d = v as PageDoc;
  if (!Array.isArray(d.blocks)) return null;
  return d;
}
function BlockRichText({ content }: { content: unknown }) {
  const html = useMemo(() => {
    try {
      if (!content || typeof content !== "object") return "";
      const raw = generateHTML(content as Parameters<typeof generateHTML>[0], [StarterKit]);
      // Preserva parágrafos vazios (TipTap gera <p></p> que colapsa no DOM)
      return raw.replace(/<p>\s*<\/p>/g, "<p><br></p>");
    } catch {
      return "";
    }
  }, [content]);
  return <div className="prose prose-sm max-w-none text-gray-800 [&_p:empty]:min-h-[1em] [&_p>br:only-child]:inline-block" dangerouslySetInnerHTML={{ __html: html }} />;
}
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
import { Separator } from "@/components/ui/separator";
import aluLogo from "@/assets/alu-logo.svg";
import {
  getPublicEventDetails,
  verifyPublicUserIdentity,
  enrollInPublicEventForUser,
  getCurrentUserDocStatus,
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
  | { status: "conflict"; message: string }
  | { status: "google"; user_id: string; email: string; needs_doc: boolean; full_name: string | null };



function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335"/>
    </svg>
  );
}

function PublicEventPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchEvent = useServerFn(getPublicEventDetails);
  const verifyFn = useServerFn(verifyPublicUserIdentity);
  const enrollFn = useServerFn(enrollInPublicEventForUser);
  const docStatusFn = useServerFn(getCurrentUserDocStatus);

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

  // ----- Pós Google OAuth: detetar sessão e perguntar o doc se faltar -----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;
      if (!sess?.user) return;
      try {
        const status = await docStatusFn();
        if (cancelled) return;
        setEmail(sess.user.email ?? "");
        setFullName(status.full_name ?? "");
        setIdentity({
          status: "google",
          user_id: sess.user.id,
          email: sess.user.email ?? "",
          needs_doc: !status.has_document,
          full_name: status.full_name,
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canVerify =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    docNumber.trim().length >= 3;

  const triggerVerify = async () => {
    if (!canVerify) return;
    if (identity.status === "google") return;
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
            res.conflict_message ??
            "O email indicado não corresponde ao documento.",
        });
      } else if (res.exists) {
        setIdentity({ status: "existing", full_name: null });
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

  // Reset identidade se utilizador mudar email/doc (exceto se vier do Google).
  useEffect(() => {
    if (identity.status === "google") return;
    if (identity.status !== "idle" && identity.status !== "checking") {
      setIdentity({ status: "idle" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, docType, docNumber]);

  const handleGoogle = async () => {
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.href,
      });
    } catch (e) {
      toast.error((e as Error).message ?? "Falha no login com Google.");
    }
  };

  const submitting = useMutation({
    mutationFn: async () => {
      let userId: string;

      if (identity.status === "google") {
        userId = identity.user_id;
      } else if (identity.status === "existing") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw new Error(error.message);
        userId = data.user!.id;
      } else if (identity.status === "new") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw new Error(error.message);
        if (!data.user) throw new Error("Não foi possível criar a conta.");
        userId = data.user.id;
      } else {
        throw new Error("Confirma primeiro o teu email e documento.");
      }

      const isGoogleNeedsDoc =
        identity.status === "google" && identity.needs_doc;
      const isNew = identity.status === "new";

      return enrollFn({
        data: {
          identifier: id,
          user_id: userId,
          email: email.trim().toLowerCase(),
          additional_data: answers,
          user_observations: obs || undefined,
          profile:
            isNew || isGoogleNeedsDoc
              ? {
                  full_name:
                    fullName.trim() || (identity.status === "google" ? identity.full_name ?? undefined : undefined),
                  doc_type: docType,
                  doc_number: docNumber.trim() || undefined,
                }
              : undefined,
        },
      });
    },
    onSuccess: (res) => {
      if (res.alreadyEnrolled) toast.info("Já estavas inscrito neste evento.");
      else if (res.status === "aceite") toast.success("Inscrição confirmada!");
      else toast.success("Estás em lista de espera (suplente).");
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

  const expanded =
    identity.status === "existing" ||
    identity.status === "new" ||
    identity.status === "google";

  const pageDoc = useMemo(
    () => parsePageDoc(event.data?.conteudo_pagina_inscricao),
    [event.data?.conteudo_pagina_inscricao],
  );
  const bg = pageDoc?.background;
  const bgOpacity = bg?.opacity ?? 1;
  const containerStyle: React.CSSProperties =
    bg?.type === "image" && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" }
      : bg?.type === "color" && bg.value
        ? { backgroundColor: bg.value }
        : {};
  const customTitle = pageDoc?.title?.trim() || event.data?.title || "";

  return (
    <div
      className="relative min-h-screen bg-gradient-to-b from-muted/40 to-muted/10 px-4 py-10"
      style={containerStyle}
    >
      {bg?.type === "image" && bgOpacity < 1 && (
        <div className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: 1 - bgOpacity }} />
      )}
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-6">
        <img src={aluLogo} alt="Academia de Líderes Ubuntu" className="h-12 w-auto" />

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
              <p className="font-medium">Não foi possível carregar este evento</p>
              <p className="text-sm text-muted-foreground">
                {(event.error as Error)?.message ?? "Link inválido."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full border-0 bg-background shadow-xl">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">{customTitle}</CardTitle>
              {event.data.start_date && (
                <CardDescription className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {event.data.start_date}
                </CardDescription>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant={closed ? "secondary" : "default"}>
                  {event.data.registration_status ?? "Aberto"}
                </Badge>
                {event.data.max_capacity != null && (
                  <Badge variant={isFull ? "secondary" : "outline"}>
                    {event.data.aceite_count} / {event.data.max_capacity} inscritos
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {pageDoc && pageDoc.blocks.length > 0 ? (
                <div className="space-y-4">
                  {pageDoc.blocks.map((b) =>
                    b.type === "richtext" ? (
                      <BlockRichText key={b.id} content={b.content} />
                    ) : b.url ? (
                      <img
                        key={b.id}
                        src={b.url}
                        alt={b.alt ?? ""}
                        className="mx-auto max-h-96 rounded object-contain"
                      />
                    ) : null,
                  )}
                </div>
              ) : (
                event.data.description && (
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {event.data.description}
                  </p>
                )
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
                  {identity.status !== "google" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        size="lg"
                        onClick={handleGoogle}
                      >
                        <GoogleIcon className="mr-2 h-5 w-5" />
                        Continuar com o Google
                      </Button>

                      <div className="flex items-center gap-3">
                        <Separator className="flex-1" />
                        <span className="text-xs uppercase text-muted-foreground">
                          ou
                        </span>
                        <Separator className="flex-1" />
                      </div>

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
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor="doc">
                            {docType === "nif"
                              ? "NIF"
                              : "Número de Passaporte / ID"}
                          </Label>
                          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                            Não tenho NIF (Sou estrangeiro)
                            <Switch
                              checked={docType === "passport"}
                              onCheckedChange={(v) =>
                                setDocType(v ? "passport" : "nif")
                              }
                            />
                          </label>
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
                          <Loader2 className="h-3 w-3 animate-spin" />
                          A verificar identidade…
                        </p>
                      )}
                      {identity.status === "conflict" && (
                        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                          {identity.message}
                        </p>
                      )}
                    </>
                  )}

                  {/* Existente (email/password) */}
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

                  {/* Novo (email/password) */}
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

                  {/* Pós Google */}
                  {identity.status === "google" && (
                    <div className="space-y-5 duration-300 animate-in fade-in">
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Sessão iniciada como{" "}
                        <span className="font-medium text-foreground">
                          {identity.email}
                        </span>
                        .
                      </p>

                      {identity.needs_doc && (
                        <>
                          {!identity.full_name && (
                            <div className="space-y-1.5">
                              <Label htmlFor="gname">Nome completo</Label>
                              <Input
                                id="gname"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <Label htmlFor="gdoc">
                                {docType === "nif"
                                  ? "NIF"
                                  : "Número de Passaporte / ID"}
                              </Label>
                              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                                Não tenho NIF (Sou estrangeiro)
                                <Switch
                                  checked={docType === "passport"}
                                  onCheckedChange={(v) =>
                                    setDocType(v ? "passport" : "nif")
                                  }
                                />
                              </label>
                            </div>
                            <Input
                              id="gdoc"
                              required
                              value={docNumber}
                              onChange={(e) => setDocNumber(e.target.value)}
                              inputMode={docType === "nif" ? "numeric" : "text"}
                            />
                          </div>
                          
                        </>
                      )}
                      <DynamicQuestions
                        fields={fields}
                        values={answers}
                        setValues={setAnswers}
                      />
                    </div>
                  )}

                  {expanded && (
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
                    disabled={submitting.isPending || !expanded}
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
