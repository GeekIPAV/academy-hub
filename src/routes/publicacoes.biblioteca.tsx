import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { RouteGate } from "@/components/RouteGate";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";
import { CoverUploader } from "@/components/CoverUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  listCategorias,
  listCategoriasComPublicacoes,
  listPublicacoes,
  proposePublicacao,
  type Publicacao,
} from "@/lib/biblioteca.functions";

export const Route = createFileRoute("/publicacoes/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca | IPAV" },
      {
        name: "description",
        content: "Biblioteca de publicações IPAV e outras obras de referência.",
      },
    ],
  }),
  component: () => (
    <RouteGate path="/publicacoes/biblioteca">
      <BibliotecaPage />
    </RouteGate>
  ),
});

type ViewMode = "gallery" | "list";

function BibliotecaPage() {
  const [tab, setTab] = useState<"ipav" | "outras">("ipav");
  const [view, setView] = useState<ViewMode>("gallery");
  const [search, setSearch] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [sort, setSort] = useState<string>("title-asc");

  const listFn = useServerFn(listPublicacoes);
  const categoriasFn = useServerFn(listCategorias);
  const categoriasComPublicacoesFn = useServerFn(listCategoriasComPublicacoes);

  const { data: categorias = [] } = useQuery({
    queryKey: ["biblioteca-categorias"],
    queryFn: () => categoriasFn(),
  });

  const { data: categoriasVisiveis = [] } = useQuery({
    queryKey: ["biblioteca-categorias-visiveis", tab],
    queryFn: () => categoriasComPublicacoesFn({ data: { tab } }),
  });

  const { data: publicacoes = [], isLoading } = useQuery({
    queryKey: ["publicacoes", tab, categoriaId, year, search, sort],
    queryFn: () => {
      const [sortBy, sortOrder] = sort.split("-") as ["title" | "author" | "year", "asc" | "desc"];
      return listFn({
        data: {
          tab,
          categoriaId: categoriaId === "all" ? null : categoriaId,
          year: year === "all" ? null : Number(year),
          search,
          sortBy,
          sortOrder,
        },
      });
    },
  });

  const years = useMemo(() => {
    const set = new Set<number>();
    publicacoes.forEach((p) => p.year && set.add(p.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [publicacoes]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <ComponentAccessMatrix pagePath="/publicacoes/biblioteca" />

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BookOpen className="h-5 w-5" />
          <span className="text-xs uppercase tracking-wider">Publicações</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Biblioteca</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Publicações do IPAV e referências externas. Pesquisa, filtra e
          sugere novas adições.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as "ipav" | "outras"); setCategoriaId("all"); }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="ipav">Publicações IPAV</TabsTrigger>
            <TabsTrigger value="outras">Outras Publicações</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant={view === "gallery" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("gallery")}
              className={view === "gallery" ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : ""}
            >
              <LayoutGrid className="h-4 w-4" />
              Galeria
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("list")}
              className={view === "list" ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : ""}
            >
              <ListIcon className="h-4 w-4" />
              Lista
            </Button>
            {tab === "outras" && <SugerirPublicacaoDialog categorias={categorias} />}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar título ou autor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger>
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger>
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title-asc">Título (A → Z)</SelectItem>
              <SelectItem value="title-desc">Título (Z → A)</SelectItem>
              <SelectItem value="author-asc">Autor (A → Z)</SelectItem>
              <SelectItem value="author-desc">Autor (Z → A)</SelectItem>
              <SelectItem value="year-asc">Ano (mais antigo)</SelectItem>
              <SelectItem value="year-desc">Ano (mais recente)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoriaId("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              categoriaId === "all"
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Todas
          </button>
          {categoriasVisiveis.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoriaId(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                categoriaId === c.id
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <TabsContent value="ipav" className="mt-6">
          <PublicacoesView publicacoes={publicacoes} view={view} loading={isLoading} />
        </TabsContent>
        <TabsContent value="outras" className="mt-6">
          <PublicacoesView publicacoes={publicacoes} view={view} loading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PublicacoesView({
  publicacoes,
  view,
  loading,
}: {
  publicacoes: Publicacao[];
  view: ViewMode;
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">A carregar…</p>;
  }
  if (!publicacoes.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Nenhuma publicação encontrada com os filtros atuais.
      </div>
    );
  }
  if (view === "gallery") {
    return (
      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {publicacoes.map((p) => (
          <PublicacaoCard key={p.id} p={p} />
        ))}
      </div>
    );
  }
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {publicacoes.map((p) => (
        <PublicacaoRow key={p.id} p={p} />
      ))}
    </div>
  );
}

function PublicacaoCard({ p }: { p: Publicacao }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/60 hover:shadow-sm"
      >
        <div className="relative mx-auto h-32 w-24 overflow-hidden rounded-md bg-muted">
          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.title}
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <BookOpen className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium leading-snug text-foreground break-words">
            {p.title}
          </h3>
          {p.author && (
            <p className="text-xs text-muted-foreground break-words">{p.author}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {p.categoria?.name && <span className="rounded bg-muted px-1.5 py-0.5">{p.categoria.name}</span>}
            {p.year && <span>{p.year}</span>}
          </div>
        </div>
      </button>
      <PublicacaoDetailsDialog p={p} open={open} onOpenChange={setOpen} />
    </>
  );
}

function PublicacaoRow({ p }: { p: Publicacao }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full gap-4 p-4 text-left transition hover:bg-muted/40"
      >
        <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded bg-muted">
          {p.image_url ? (
            <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-medium text-foreground">{p.title}</h3>
          {p.author && <p className="text-xs text-muted-foreground">{p.author}</p>}
          {p.summary && <p className="text-xs text-muted-foreground line-clamp-2">{p.summary}</p>}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {p.categoria?.name && (
              <span className="rounded bg-muted px-1.5 py-0.5">{p.categoria.name}</span>
            )}
            {p.year && <span>{p.year}</span>}
          </div>
        </div>
      </button>
      <PublicacaoDetailsDialog p={p} open={open} onOpenChange={setOpen} />
    </>
  );
}

function PublicacaoDetailsDialog({
  p,
  open,
  onOpenChange,
}: {
  p: Publicacao;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-left">{p.title}</DialogTitle>
          {p.author && (
            <DialogDescription className="text-left">{p.author}</DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[160px_1fr]">
          <div className="mx-auto h-52 w-40 overflow-hidden rounded-md bg-muted md:mx-0">
            {p.image_url ? (
              <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <BookOpen className="h-10 w-10" />
              </div>
            )}
          </div>
          <dl className="space-y-3 text-sm">
            {p.categoria?.name && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Categoria</dt>
                <dd className="text-foreground">{p.categoria.name}</dd>
              </div>
            )}
            {p.year && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Ano</dt>
                <dd className="text-foreground">{p.year}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</dt>
              <dd className="text-foreground">{p.is_ipav ? "Publicação IPAV" : "Outra publicação"}</dd>
            </div>
            {p.summary && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Resumo</dt>
                <dd className="whitespace-pre-wrap text-foreground">{p.summary}</dd>
              </div>
            )}
          </dl>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {p.link && (
            <Button asChild>
              <a href={p.link} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir link
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SugerirPublicacaoDialog({ categorias }: { categorias: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    author: "",
    summary: "",
    year: "",
    link: "",
    image_url: "",
    categoria_id: "",
  });
  const [tempId] = useState(() => crypto.randomUUID());
  const proposeFn = useServerFn(proposePublicacao);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      proposeFn({
        data: {
          title: form.title,
          author: form.author || null,
          summary: form.summary || null,
          year: form.year ? Number(form.year) : null,
          link: form.link || null,
          image_url: form.image_url || null,
          categoria_id: form.categoria_id || null,
        },
      }),
    onSuccess: () => {
      toast.success("Proposta enviada. Aguarda moderação.");
      qc.invalidateQueries({ queryKey: ["publicacoes"] });
      setOpen(false);
      setForm({ title: "", author: "", summary: "", year: "", link: "", image_url: "", categoria_id: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="h-4 w-4" />
          Sugerir Publicação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sugerir uma publicação</DialogTitle>
          <DialogDescription>
            A proposta será revista por um administrador antes de ser publicada.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title.trim()) {
              toast.error("Indica o título.");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={300}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="author">Autor</Label>
              <Input
                id="author"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                maxLength={300}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                min={1800}
                max={3000}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select
              value={form.categoria_id || undefined}
              onValueChange={(v) => setForm({ ...form, categoria_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar…" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link">Link</Label>
            <Input
              id="link"
              type="url"
              placeholder="https://…"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              maxLength={1000}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="summary">Resumo</Label>
            <Textarea
              id="summary"
              rows={3}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              maxLength={4000}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Capa</Label>
            <div className="flex items-center gap-3">
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="h-16 w-12 rounded object-cover"
                />
              )}
              <CoverUploader
                folder="publicacoes"
                id={tempId}
                currentUrl={form.image_url || null}
                variant="inline"
                onUploaded={(url) => setForm((f) => ({ ...f, image_url: url }))}
                onCleared={() => setForm((f) => ({ ...f, image_url: "" }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "A enviar…" : "Enviar proposta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
