import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, LogIn, ShieldAlert, Loader2, Check } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPublicEventDetails,
  enrollInPublicEvent,
  type RequiredField,
} from "@/lib/public-event.functions";

export const Route = createFileRoute("/evento/$id")({
  head: () => ({ meta: [{ title: "Inscrição em evento — Academia Ubuntu" }] }),
  component: PublicEventPage,
});

function PublicEventPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchEvent = useServerFn(getPublicEventDetails);
  const enrollFn = useServerFn(enrollInPublicEvent);

  const event = useQuery({
    queryKey: ["public-event", id],
    queryFn: () => fetchEvent({ data: { identifier: id } }),
    retry: false,
  });

  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setAuthedUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthedUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const [values, setValues] = useState<Record<string, string>>({});
  const [obs, setObs] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      enrollFn({
        data: {
          identifier: id,
          additional_data: values,
          user_observations: obs || undefined,
        },
      }),
    onSuccess: (res) => {
      if (res.alreadyEnrolled) {
        toast.info("Já estavas inscrito neste evento.");
      } else {
        toast.success(
          res.status === "aceite"
            ? "Inscrição confirmada!"
            : "Estás em lista de espera (suplente).",
        );
      }
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goToAuth = () => {
    navigate({ to: "/auth", search: { redirect: `/evento/${id}` } });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {event.isLoading || !authChecked ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : event.isError ? (
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <p className="font-medium">Não foi possível carregar o evento</p>
            <p className="text-sm text-muted-foreground">
              {(event.error as Error)?.message ?? "Link inválido."}
            </p>
            <Button variant="outline" onClick={() => navigate({ to: "/" })}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      ) : event.data ? (
        <EventForm
          data={event.data}
          values={values}
          setValues={setValues}
          obs={obs}
          setObs={setObs}
          authed={!!authedUserId}
          onSubmit={() => mutation.mutate()}
          onAuth={goToAuth}
          submitting={mutation.isPending}
        />
      ) : null}
    </div>
  );
}

interface EventFormProps {
  data: NonNullable<
    Awaited<ReturnType<typeof getPublicEventDetails>>
  >;
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  obs: string;
  setObs: (v: string) => void;
  authed: boolean;
  onSubmit: () => void;
  onAuth: () => void;
  submitting: boolean;
}

function EventForm({
  data,
  values,
  setValues,
  obs,
  setObs,
  authed,
  onSubmit,
  onAuth,
  submitting,
}: EventFormProps) {
  const fields: RequiredField[] = data.required_fields ?? [];
  const isFull =
    data.max_capacity != null && data.aceite_count >= data.max_capacity;
  const closed =
    data.registration_status != null && data.registration_status !== "Aberto";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {data.title ?? "Evento"}
        </CardTitle>
        {data.action_date && (
          <CardDescription className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {data.action_date}
          </CardDescription>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant={closed ? "secondary" : "default"}>
            {data.registration_status ?? "Aberto"}
          </Badge>
          {data.max_capacity != null && (
            <Badge variant={isFull ? "secondary" : "outline"}>
              {data.aceite_count} / {data.max_capacity} inscritos
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {data.description}
          </p>
        )}

        {closed ? (
          <p className="rounded-md bg-muted p-3 text-sm">
            As inscrições para este evento não estão abertas.
          </p>
        ) : !authed ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Para te inscreveres, faz login ou cria uma conta.
            </p>
            <Button className="w-full" onClick={onAuth}>
              <LogIn className="mr-2 h-4 w-4" />
              Fazer Login / Registar
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
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

            <div className="space-y-1.5">
              <Label htmlFor="obs">Observações (opcional)</Label>
              <Textarea
                id="obs"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A submeter…
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {isFull ? "Inscrever (lista de espera)" : "Confirmar inscrição"}
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
