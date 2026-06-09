import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useServerFn } from "@tanstack/react-start";
import { verifyAuthEmail } from "@/lib/auth-identity.functions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import aluLogo from "@/assets/alu-logo.svg";
import authBackground from "@/assets/auth-background.png";
import { LoadingU } from "@/components/LoadingU";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Entrar — Academia Ubuntu" }] }),
  component: AuthPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "initial" | "login" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const safeRedirect =
    redirect && /^\/(?!\/)/.test(redirect) ? redirect : null;
  const target = safeRedirect ?? "/dashboard";
  const inviteToken = safeRedirect?.match(/^\/convite\/([^/?#]+)/)?.[1] ?? null;

  const verifyEmail = useServerFn(verifyAuthEmail);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: target });
    });
  }, [navigate, target]);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [mode, setMode] = useState<Mode>("initial");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [bgLoaded, setBgLoaded] = useState(false);
  const lastCheckedEmail = useRef<string | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = authBackground;
    if (img.complete) {
      setBgLoaded(true);
    } else {
      img.onload = () => setBgLoaded(true);
      img.onerror = () => setBgLoaded(true);
    }
  }, []);

  // Se o utilizador edita o email depois de já termos expandido, recolhe.
  useEffect(() => {
    if (mode !== "initial" && email !== lastCheckedEmail.current) {
      setMode("initial");
      setPassword("");
      setFullName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const runEmailCheck = async () => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) return;
    if (lastCheckedEmail.current === normalized && mode !== "initial") return;
    setChecking(true);
    try {
      const res = await verifyEmail({ data: { email: normalized } });
      lastCheckedEmail.current = normalized;
      if (res.exists) {
        setMode("login");
        setTimeout(() => passwordRef.current?.focus(), 60);
      } else {
        setMode("signup");
        setTimeout(() => nameRef.current?.focus(), 60);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha na verificação.";
      toast.error(msg);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      toast.error("Introduz um email válido.");
      return;
    }
    if (mode === "initial") {
      await runEmailCheck();
      return;
    }
    if (mode === "login") {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Bem-vindo!");
      navigate({ to: target });
      return;
    }
    // signup
    if (!fullName.trim()) {
      toast.error("Indica o teu nome completo.");
      return;
    }
    if (password.length < 6) {
      toast.error("A password tem de ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${target}`,
        data: {
          full_name: fullName.trim(),
          ...(inviteToken ? { invite_token: inviteToken } : {}),
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success("Conta criada!");
      navigate({ to: target });
      return;
    }
    toast.success("Conta criada! Verifica o teu email para confirmar.");
  };

  const handleForgotPassword = async () => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      return toast.error("Introduz o teu email primeiro.");
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Email de recuperação enviado. Verifica a tua caixa de entrada.");
  };

  const handleOAuth = async (provider: "google" | "microsoft") => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + target,
    });
    if (result.error) {
      setLoading(false);
      return toast.error(result.error.message);
    }
    if (result.redirected) return;
    navigate({ to: target });
  };

  if (!bgLoaded) return <LoadingU />;

  const primaryLabel =
    mode === "login"
      ? loading
        ? "A entrar…"
        : "Entrar"
      : mode === "signup"
        ? loading
          ? "A criar…"
          : "Criar conta e entrar"
        : checking
          ? "A verificar…"
          : "Continuar";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${authBackground})`,
      }}
    >
      <Card className="w-full max-w-md backdrop-blur-sm bg-card/95 overflow-hidden transition-all duration-300">
        <CardHeader className="flex items-center justify-center bg-[#183967]">
          <img
            src={aluLogo}
            alt="Academia de Líderes Ubuntu"
            className="h-32 w-auto"
          />
        </CardHeader>
        <CardContent className="pt-6">
          {mode !== "initial" && (
            <div className="mb-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <h2 className="text-lg font-semibold">
                {mode === "login"
                  ? `Bem-vindo de volta${fullName ? `, ${fullName.split(" ")[0]}` : ""}`
                  : "Vamos criar a tua conta"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {mode === "login"
                  ? "Introduz a tua password para entrar."
                  : "Indica o teu nome e cria uma password."}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                className="bg-white"
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => {
                  if (mode === "initial") runEmailCheck();
                }}
                disabled={loading}
              />
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                <Label htmlFor="auth-name">Nome completo</Label>
                <Input
                  ref={nameRef}
                  className="bg-white"
                  id="auth-name"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            {(mode === "login" || mode === "signup") && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                <Label htmlFor="auth-password">
                  {mode === "signup" ? "Cria uma password" : "Password"}
                </Label>
                <Input
                  ref={passwordRef}
                  className="bg-white"
                  id="auth-password"
                  type="password"
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || checking}
              className="w-full"
            >
              {primaryLabel}
            </Button>

            {mode === "login" && (
              <div className="text-center animate-in fade-in duration-300">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Esqueci-me da password
                </button>
              </div>
            )}
          </form>

          <div className="my-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={loading}
              onClick={() => handleOAuth("google")}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continuar com Google
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={loading}
              onClick={() => handleOAuth("microsoft")}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M1 1h10v10H1z" fill="#F25022" />
                <path d="M13 1h10v10H13z" fill="#7FBA00" />
                <path d="M1 13h10v10H1z" fill="#00A4EF" />
                <path d="M13 13h10v10H13z" fill="#FFB900" />
              </svg>
              Continuar com Microsoft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
