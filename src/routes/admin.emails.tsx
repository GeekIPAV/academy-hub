import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Mail, RotateCcw, Save } from "lucide-react";
import {
  listEmailTemplates,
  getEmailTemplate,
  saveEmailTemplate,
  resetEmailTemplate,
  type EmailTemplateListItem,
} from "@/lib/admin-emails.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RichTextEditor } from "@/components/rich-text-editor";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/emails")({
  head: () => ({ meta: [{ title: "Gestão de Emails — Admin" }] }),
  component: AdminEmailsPage,
});

function renderPreview(html: string, vars: { key: string; example: string }[]) {
  let out = html;
  for (const v of vars) {
    out = out.replaceAll(`{{${v.key}}}`, v.example);
  }
  return out;
}

function AdminEmailsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listEmailTemplates);
  const getFn = useServerFn(getEmailTemplate);
  const saveFn = useServerFn(saveEmailTemplate);
  const resetFn = useServerFn(resetEmailTemplate);

  const listQuery = useQuery({
    queryKey: ["admin-emails-list"],
    queryFn: () => listFn(),
  });

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!selectedKey && listQuery.data && listQuery.data.length > 0) {
      setSelectedKey(listQuery.data[0].key);
    }
  }, [listQuery.data, selectedKey]);

  const detailQuery = useQuery({
    queryKey: ["admin-emails-detail", selectedKey],
    queryFn: () => getFn({ data: { key: selectedKey! } }),
    enabled: !!selectedKey,
  });

  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  useEffect(() => {
    if (detailQuery.data) {
      setSubject(detailQuery.data.subject);
      setBodyHtml(detailQuery.data.bodyHtml);
    }
  }, [detailQuery.data]);

  const saveMut = useMutation({
    mutationFn: () =>
      saveFn({ data: { key: selectedKey!, subject, bodyHtml } }),
    onSuccess: () => {
      toast.success("Template guardado.");
      qc.invalidateQueries({ queryKey: ["admin-emails-list"] });
      qc.invalidateQueries({ queryKey: ["admin-emails-detail", selectedKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: () => resetFn({ data: { key: selectedKey! } }),
    onSuccess: () => {
      toast.success("Template restaurado para o original.");
      qc.invalidateQueries({ queryKey: ["admin-emails-list"] });
      qc.invalidateQueries({ queryKey: ["admin-emails-detail", selectedKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const all = listQuery.data ?? [];
    return {
      auth: all.filter((t) => t.kind === "auth"),
      app: all.filter((t) => t.kind === "app"),
    } as { auth: EmailTemplateListItem[]; app: EmailTemplateListItem[] };
  }, [listQuery.data]);

  const selected = listQuery.data?.find((t) => t.key === selectedKey);
  const detail = detailQuery.data;

  const insertVariable = (varKey: string) => {
    setBodyHtml((b) => `${b} {{${varKey}}}`);
    setSubject((s) => (s ? s : `{{${varKey}}}`));
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Gestão de Emails</h1>
          <p className="text-sm text-muted-foreground">
            Edita o assunto e o corpo dos emails enviados pela plataforma.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={pickerOpen}
                className="w-full justify-between"
              >
                {selected ? selected.displayName : "Seleciona um template…"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Pesquisar template…" />
                <CommandList>
                  <CommandEmpty>Sem resultados.</CommandEmpty>
                  <CommandGroup heading="Autenticação">
                    {grouped.auth.map((t) => (
                      <CommandItem
                        key={t.key}
                        value={`${t.displayName} ${t.key}`}
                        onSelect={() => {
                          setSelectedKey(t.key);
                          setPickerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedKey === t.key ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{t.displayName}</span>
                          <span className="text-xs text-muted-foreground">
                            {t.description}
                          </span>
                        </div>
                        {t.customized && (
                          <Badge variant="secondary" className="ml-auto">
                            Editado
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Aplicação">
                    {grouped.app.map((t) => (
                      <CommandItem
                        key={t.key}
                        value={`${t.displayName} ${t.key}`}
                        onSelect={() => {
                          setSelectedKey(t.key);
                          setPickerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedKey === t.key ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{t.displayName}</span>
                          <span className="text-xs text-muted-foreground">
                            {t.description}
                          </span>
                        </div>
                        {t.customized && (
                          <Badge variant="secondary" className="ml-auto">
                            Editado
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {detail && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Variáveis disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {detail.variables.map((v) => (
                  <Button
                    key={v.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(v.key)}
                    title={`Inserir {{${v.key}}}`}
                  >
                    <span className="font-mono text-xs">{`{{${v.key}}}`}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {v.label}
                    </span>
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Clica numa variável para a inserir no corpo. Também podes escrever{" "}
                <code>{`{{nome}}`}</code> diretamente no assunto.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conteúdo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-subject">Assunto</Label>
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Corpo</Label>
                <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pré-visualização</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-sm">
                <span className="text-muted-foreground">Assunto: </span>
                <strong>
                  {renderPreview(subject, detail.variables)}
                </strong>
              </div>
              <div
                className="rounded-md border bg-background p-4 text-sm"
                dangerouslySetInnerHTML={{
                  __html: renderPreview(bodyHtml, detail.variables),
                }}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {detail.customized && (
              <Button
                variant="outline"
                onClick={() => resetMut.mutate()}
                disabled={resetMut.isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restaurar original
              </Button>
            )}
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !subject.trim() || !bodyHtml.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMut.isPending ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
