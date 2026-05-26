import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import aluLogo from "@/assets/alu-logo.svg";
import authBackground from "@/assets/auth-background.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir password — Academia Ubuntu" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase auto-processes the recovery token from the URL hash and emits
    // a PASSWORD_RECOVERY event. We listen and only then allow updating.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // If user lands here already in a recovery session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password mínima de 6 caracteres.");
    if (password !== confirm) return toast.error("As passwords não coincidem.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password atualizada. Já podes entrar.");
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${authBackground})`,
      }}
    >
      <Card className="w-full max-w-md backdrop-blur-sm bg-card/95 overflow-hidden">
        <CardHeader className="flex items-center justify-center bg-[#183967]">
          <img src={aluLogo} alt="Academia de Líderes Ubuntu" className="h-32 w-auto" />
        </CardHeader>
        <CardContent className="pt-6">
          <CardTitle className="mb-4 text-center">Redefinir password</CardTitle>
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">
              A validar o link de recuperação…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nova password</Label>
                <Input
                  className="bg-white"
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmar password</Label>
                <Input
                  className="bg-white"
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "A atualizar…" : "Atualizar password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
