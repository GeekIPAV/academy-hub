import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Search, ArrowLeft, PlusCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createPendingEntidade,
  linkExistingEntidade,
  searchEntidades,
} from "@/lib/entidade.functions";

type EntityRow = {
  id: string;
  name: string;
  status: string | null;
  locality: string | null;
};

type FormState = {
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  postal_code: string;
  locality: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  postal_code: "",
  locality: "",
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fuzzyMatch(haystack: string, query: string): boolean {
  const nh = normalize(haystack);
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => nh.includes(t));
}

export function EntityOnboardingFlow() {
  const qc = useQueryClient();
  const searchFn = useServerFn(searchEntidades);
  const linkFn = useServerFn(linkExistingEntidade);
  const createFn = useServerFn(createPendingEntidade);

  const { data: entidades, isLoading } = useQuery({
    queryKey: ["onboarding", "entidades"],
    queryFn: () => searchFn(),
  });

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "link" | "create">("search");
  const [selected, setSelected] = useState<EntityRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const list = (Array.isArray(entidades) ? entidades : []) as EntityRow[];
  const filtered = useMemo(() => {
    if (query.trim().length === 0) return list.slice(0, 8);
    return list.filter((e) => fuzzyMatch(e.name, query)).slice(0, 20);
  }, [list, query]);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["my-entidade"] });
    qc.invalidateQueries({ queryKey: ["current-profile"] });
    qc.invalidateQueries({ queryKey: ["my-cohorts"] });
    qc.invalidateQueries({ queryKey: ["onboarding"] });
  };

  const linkMut = useMutation({
    mutationFn: () =>
      linkFn({
        data: {
          entityId: selected!.id,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
        },
      }),
    onSuccess: () => {
      toast.success("Conta vinculada à organização.");
      refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name: form.name,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          address: form.address || null,
          postal_code: form.postal_code || null,
          locality: form.locality || null,
        },
      }),
    onSuccess: () => {
      toast.success("Organização registada — aguarda aprovação.");
      refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startLink = (e: EntityRow) => {
    setSelected(e);
    setForm({
      name: e.name,
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      postal_code: "",
      locality: e.locality ?? "",
    });
    setMode("link");
  };

  const startCreate = () => {
    setSelected(null);
    setForm({ ...EMPTY_FORM, name: query.trim() });
    setMode("create");
  };

  const back = () => {
    setMode("search");
    setSelected(null);
  };

  if (mode !== "search") {
    const submitting = linkMut.isPending || createMut.isPending;
    const isCreate = mode === "create";
    const canSubmit = isCreate ? form.name.trim().length >= 3 : true;
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={back} disabled={submitting}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          </div>
          <CardTitle className="text-xl">
            {isCreate ? "Registar nova organização" : `Confirmar dados — ${selected?.name}`}
          </CardTitle>
          <CardDescription>
            {isCreate
              ? "O registo ficará pendente até aprovação pela equipa da Academia Ubuntu."
              : "Reveja os dados e atualize o ponto de contacto se necessário."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isCreate) {
                if (form.name.trim().length < 3) {
                  toast.error("Nome demasiado curto. Procure primeiro para evitar duplicados.");
                  return;
                }
                createMut.mutate();
              } else {
                linkMut.mutate();
              }
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="onb-name">Nome da Organização</Label>
              <Input
                id="onb-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={200}
                disabled={!isCreate}
              />
              {!isCreate && (
                <p className="text-xs text-muted-foreground">
                  Para alterar o nome, contacte a Academia.
                </p>
              )}
            </div>

            {isCreate && (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="onb-address">Morada</Label>
                  <Input
                    id="onb-address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    maxLength={300}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onb-cp">Código Postal</Label>
                  <Input
                    id="onb-cp"
                    value={form.postal_code}
                    placeholder="1234-567"
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onb-loc">Localidade</Label>
                  <Input
                    id="onb-loc"
                    value={form.locality}
                    onChange={(e) => setForm({ ...form, locality: e.target.value })}
                    maxLength={150}
                  />
                </div>
              </>
            )}

            <div className="space-y-2 sm:col-span-2 border-t pt-4">
              <p className="text-sm font-medium">Ponto de Contacto</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="onb-cname">Nome do Responsável</Label>
              <Input
                id="onb-cname"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onb-cemail">Email</Label>
              <Input
                id="onb-cemail"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                maxLength={255}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="onb-cphone">Telefone</Label>
              <Input
                id="onb-cphone"
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                maxLength={50}
              />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={back} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || !canSubmit}>
                {submitting
                  ? "A submeter…"
                  : isCreate
                    ? "Registar organização"
                    : "Confirmar e entrar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Bem-vindo à Academia Ubuntu</CardTitle>
        <CardDescription>
          Para começar, vincule a sua conta à organização que representa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procure pela sua Organização/Escola…"
            className="pl-9"
          />
        </div>

        <div className="rounded-md border">
          {isLoading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma organização encontrada para “{query}”.
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => startLink(e)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{e.name}</div>
                      {e.locality && (
                        <div className="truncate text-xs text-muted-foreground">{e.locality}</div>
                      )}
                    </div>
                    {e.status && e.status.toLowerCase() === "pendente" && (
                      <Badge variant="outline" className="border-amber-500 text-amber-700">
                        Pendente
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 border-t pt-4 text-center">
          <p className="text-sm text-muted-foreground">Não encontrou a sua organização?</p>
          <Button variant="outline" onClick={startCreate} disabled={query.trim().length < 3}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Registar nova organização
          </Button>
          {query.trim().length < 3 && (
            <p className="text-xs text-muted-foreground">
              Escreva pelo menos 3 caracteres para procurar antes de registar.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
