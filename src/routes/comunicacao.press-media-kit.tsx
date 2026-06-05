import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { RouteGate } from "@/components/RouteGate";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";


export const Route = createFileRoute("/comunicacao/press-media-kit")({
  head: () => ({
    meta: [
      { title: "Press Kit — Academia de Líderes Ubuntu" },
      {
        name: "description",
        content:
          "Press Kit da Academia de Líderes Ubuntu: apresentação do projeto, identidade visual, logos e fotografias.",
      },
    ],
  }),
  component: () => (
    <RouteGate path="/comunicacao/press-media-kit">
      <PressKitPage />
    </RouteGate>
  ),
});


type PressLink = { label: string; url: string };
type PageContent = {
  title: string;
  body: string;
  links: PressLink[];
};

const SLUG = "press-media-kit";

const DEFAULT_CONTENT: PageContent = {
  title: "ACADEMIA DE LÍDERES UBUNTU — Press Kit",
  body: `<p>A Academia de Líderes Ubuntu é um projeto de educação não-formal, desenvolvido pelo Instituto Padre António Vieira (IPAV) a partir da filosofia <em>"Ubuntu - Eu sou porque tu és"</em> que visa o desenvolvimento de competências socioemocionais, com uma forte base experiencial e relacional.</p><p>Tem como espaço privilegiado de atuação a escola e o seu universo educativo, envolvendo crianças, jovens, educadores e a comunidade educativa.</p><p>Contribui para a descoberta do sentido e propósito das crianças, jovens e dos seus educadores e, por meio disso, para a capacitação de novas lideranças ao serviço da comunidade.</p>`,
  links: [
    { label: "Identidade Visual ALU — Manual de Normas ALU.pdf", url: "#" },
    { label: "Logos ALU", url: "#" },
    {
      label: "Fotografias da Academia — Flickr IPAV",
      url: "https://www.flickr.com/photos/ipav/albums",
    },
  ],
};

function PressKitPage() {
  const { isAdmin } = useApp();
  const [content, setContent] = useState<PageContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PageContent>(DEFAULT_CONTENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("paginas_conteudo")
        .select("content")
        .eq("slug", SLUG)
        .maybeSingle();
      if (!error && data?.content) {
        const stored = data.content as unknown as Partial<PageContent>;
        setContent({
          title: stored.title ?? DEFAULT_CONTENT.title,
          body: stored.body ?? DEFAULT_CONTENT.body,
          links: Array.isArray(stored.links) ? stored.links : DEFAULT_CONTENT.links,
        });
      }
      setLoading(false);
    })();
  }, []);

  const openEditor = () => {
    setDraft(JSON.parse(JSON.stringify(content)));
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("paginas_conteudo")
      .upsert({ slug: SLUG, content: draft as unknown as never }, { onConflict: "slug" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao guardar");
      return;
    }
    setContent(draft);
    setEditing(false);
    toast.success("Press Kit atualizado");
  };

  const updateLink = (i: number, patch: Partial<PressLink>) => {
    setDraft((d) => ({
      ...d,
      links: d.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));
  };
  const addLink = () =>
    setDraft((d) => ({ ...d, links: [...d.links, { label: "Novo recurso", url: "#" }] }));
  const removeLink = (i: number) =>
    setDraft((d) => ({ ...d, links: d.links.filter((_, idx) => idx !== i) }));

  if (loading) {
    return <div className="mx-auto max-w-3xl py-4 text-muted-foreground">A carregar…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl py-4 space-y-8">
      <ComponentAccessMatrix pagePath="/comunicacao/press-media-kit" />
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {content.title}
        </h1>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={openEditor} className="shrink-0">
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      {content.body && (
        /<[a-z][\s\S]*>/i.test(content.body) ? (
          <div
            className="rich-text leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content.body) }}
          />
        ) : (
          <div className="space-y-4 leading-relaxed">
            {content.body
              .split(/\n\n+/)
              .filter((p) => p.trim().length > 0)
              .map((para, j) => (
                <p key={j} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
          </div>
        )
      )}

      {content.links.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Materiais</h2>
          <ul className="space-y-2">
            {content.links.map((link, i) => (
              <li key={i}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-secondary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Press Kit</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Texto de apresentação</Label>
              <RichTextEditor
                value={draft.body}
                onChange={(html) => setDraft((d) => ({ ...d, body: html }))}
              />
            </div>

            <div className="space-y-3">
              <Label>Materiais (links)</Label>
              {draft.links.map((l, i) => (
                <div key={i} className="space-y-2 border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Link {i + 1}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeLink(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Etiqueta"
                    value={l.label}
                    onChange={(e) => updateLink(i, { label: e.target.value })}
                  />
                  <Input
                    placeholder="URL (https://…)"
                    value={l.url}
                    onChange={(e) => updateLink(i, { url: e.target.value })}
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLink}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar link
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
