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
import { Pencil, Plus, Trash2 } from "lucide-react";
import { RouteGate } from "@/components/RouteGate";


export const Route = createFileRoute("/comunicacao/propriedade-intelectual")({
  head: () => ({
    meta: [
      { title: "Propriedade Intelectual — IPAV" },
      { name: "description", content: "Metodologia Ubuntu, regulamentos e condições de uso dos recursos pedagógicos do IPAV." },
    ],
  }),
  component: () => (
    <RouteGate path="/comunicacao/propriedade-intelectual">
      <PropriedadeIntelectualPage />
    </RouteGate>
  ),
});


type Section = { heading: string; body: string; italic?: boolean };
type PageContent = { title: string; sections: Section[] };

const SLUG = "propriedade-intelectual";

const DEFAULT_CONTENT: PageContent = {
  title: "Metodologia Ubuntu, produtos e terminologia",
  sections: [],
};

function PropriedadeIntelectualPage() {
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
        setContent(data.content as unknown as PageContent);
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
    toast.success("Conteúdo atualizado");
  };

  const updateSection = (i: number, patch: Partial<Section>) => {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  };

  const addSection = () => {
    setDraft((d) => ({ ...d, sections: [...d.sections, { heading: "Novo título", body: "" }] }));
  };

  const removeSection = (i: number) => {
    setDraft((d) => ({ ...d, sections: d.sections.filter((_, idx) => idx !== i) }));
  };

  if (loading) {
    return <div className="mx-auto max-w-3xl py-4 text-muted-foreground">A carregar…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl py-4 space-y-12">
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

      {content.sections.map((section, i) => (
        <section key={i} className="space-y-4 leading-relaxed">
          <h2 className="font-semibold">{section.heading}</h2>
          {section.body.split(/\n\n+/).map((para, j) => (
            <p key={j} className={section.italic ? "italic text-foreground/90 whitespace-pre-line" : "whitespace-pre-line"}>
              {para}
            </p>
          ))}
        </section>
      ))}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar página</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Título principal</Label>
              <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            </div>

            {draft.sections.map((s, i) => (
              <div key={i} className="space-y-2 border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <Label>Secção {i + 1}</Label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={!!s.italic}
                        onChange={(e) => updateSection(i, { italic: e.target.checked })}
                      />
                      Itálico
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => removeSection(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Input
                  placeholder="Título da secção"
                  value={s.heading}
                  onChange={(e) => updateSection(i, { heading: e.target.value })}
                />
                <Textarea
                  placeholder="Texto (use linha em branco para separar parágrafos)"
                  value={s.body}
                  rows={6}
                  onChange={(e) => updateSection(i, { body: e.target.value })}
                />
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addSection}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar secção
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "A guardar…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
