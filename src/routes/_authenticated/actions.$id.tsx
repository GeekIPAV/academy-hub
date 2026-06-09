import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getAction } from "@/lib/actions.functions";
import { enrollInAction } from "@/lib/enrollment.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface RequiredField {
  name: string;
  label?: string;
  type?: "text" | "number" | "email" | "tel" | "textarea" | "date";
  required?: boolean;
}

export const Route = createFileRoute("/_authenticated/actions/$id")({
  head: () => ({ meta: [{ title: "Inscrição — Academia Ubuntu" }] }),
  component: ActionDetailPage,
});

// Mapeia (case-insensitive, sem acento) o nome do campo → valor do perfil
function normKey(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function profileValueFor(
  fieldName: string,
  profile: Record<string, unknown> | null,
  email: string | null,
): string {
  if (!profile && !email) return "";
  const k = normKey(fieldName);
  const map: Record<string, string | null | undefined> = {
    nome: (profile?.full_name as string) ?? null,
    nomecompleto: (profile?.full_name as string) ?? null,
    fullname: (profile?.full_name as string) ?? null,
    primeironome: (profile?.first_names as string) ?? null,
    apelido: (profile?.last_names as string) ?? null,
    email: email ?? null,
    nif: (profile?.nif as string) ?? null,
    datanascimento: (profile?.birth_date as string) ?? null,
    birthdate: (profile?.birth_date as string) ?? null,
    genero: (profile?.gender as string) ?? null,
    nacionalidade: (profile?.nationality_country as string) ?? null,
    morada: (profile?.address as string) ?? null,
    address: (profile?.address as string) ?? null,
    codigopostal: (profile?.address_cp4 as string) ?? null,
    concelho: (profile?.residence_concelho as string) ?? null,
    profissao: (profile?.job_title as string) ?? null,
    instituicao: (profile?.work_institution as string) ?? null,
    habilitacoes: (profile?.education_level as string) ?? null,
  };
  return map[k] ?? "";
}

function ActionDetailPage() {
  const { id } = Route.useParams();
  const fetchFn = useServerFn(getAction);
  const profileFn = useServerFn(getMyProfile);
  const enrollFn = useServerFn(enrollInAction);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["action", id],
    queryFn: () => fetchFn({ data: { id } }),
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => profileFn(),
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [obs, setObs] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  // Pré-preencher quando ambos chegarem
  useEffect(() => {
    if (prefilled || !data || !me) return;
    const fields: RequiredField[] = Array.isArray(data.required_fields)
      ? (data.required_fields as unknown as RequiredField[])
      : [];
    const initial: Record<string, string> = {};
    for (const f of fields) {
      const v = profileValueFor(f.label ?? f.name, me.profile as Record<string, unknown> | null, me.email);
      if (v) initial[f.name] = v;
    }
    setValues(initial);
    setPrefilled(true);
  }, [data, me, prefilled]);

  const mutation = useMutation({
    mutationFn: () =>
      enrollFn({
        data: {
          action_id: id,
          additional_data: values,
          user_observations: obs || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success(
        res.status === "aceite"
          ? "Inscrição confirmada!"
          : "Estás em lista de espera (suplente).",
      );
      qc.invalidateQueries({ queryKey: ["action", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">A carregar…</p>;
  if (error)
    return <p className="text-sm text-destructive">Erro: {(error as Error).message}</p>;
  if (!data) return <p>Ação não encontrada.</p>;

  const fields: RequiredField[] = Array.isArray(data.required_fields)
    ? (data.required_fields as unknown as RequiredField[])
    : [];

  const isFull =
    data.max_capacity != null && data.aceite_count >= data.max_capacity;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/actions" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {data.title ?? "(sem título)"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.programas?.title ?? "Sem programa"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Detalhes</CardTitle>
            <Badge variant={isFull ? "secondary" : "default"}>
              {data.aceite_count}
              {data.max_capacity != null ? ` / ${data.max_capacity}` : ""} inscritos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.description && <p>{data.description}</p>}
          {data.start_date && <p>Data: {data.start_date}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inscrição</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            {fields.map((f) => {
              const key = f.name;
              const label = f.label ?? f.name;
              const type = f.type ?? "text";
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

            <div className="space-y-1.5">
              <Label htmlFor="obs">Observações (opcional)</Label>
              <Textarea
                id="obs"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "A submeter…"
                : isFull
                  ? "Inscrever (lista de espera)"
                  : "Inscrever"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
