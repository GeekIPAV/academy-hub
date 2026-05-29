import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, FileText, BookOpen, Scale } from "lucide-react";

export const Route = createFileRoute("/comunicacao/propriedade-intelectual")({
  head: () => ({
    meta: [
      { title: "Propriedade Intelectual — IPAV" },
      { name: "description", content: "Metodologia Ubuntu, regulamentos e condições de uso dos recursos pedagógicos do IPAV." },
    ],
  }),
  component: PropriedadeIntelectualPage,
});

function PropriedadeIntelectualPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2">
      {/* Cabeçalho */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-secondary">
          Propriedade Intelectual
        </h1>
        <p className="text-muted-foreground">
          Informação sobre a metodologia Ubuntu, regulamentos e condições de uso dos recursos pedagógicos do IPAV.
        </p>
      </div>

      {/* Secção 1 — Metodologia Ubuntu */}
      <Card className="border-l-4 border-l-ubuntu-orange">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ubuntu-orange/10 text-ubuntu-orange">
              <Shield className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl text-secondary">
              Metodologia Ubuntu, produtos e terminologia
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-foreground/90">
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <FileText className="h-4 w-4" />
              Regulamento
            </h3>
            <p className="leading-relaxed">
              A metodologia Ubuntu e todos os produtos e terminologia através dela desenvolvidos, são propriedade do <strong>IPAV</strong> e estão protegidos por direitos de autor.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Scale className="h-4 w-4" />
              Condições de utilização
            </h3>
            <p className="leading-relaxed">
              A utilização da metodologia, no todo ou em parte, bem como de qualquer elemento, produto ou terminologia dela decorrentes, terá que ser <strong>expressamente autorizada</strong> pela Direção do IPAV.
            </p>
            <p className="leading-relaxed">
              Qualquer utilização não autorizada merecerá, da parte do IPAV, todos os <strong>procedimentos legais, civis e criminais</strong>, considerados adequados para repor a justiça.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Secção 2 — Recursos Pedagógicos */}
      <Card className="border-l-4 border-l-secondary">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <BookOpen className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl text-secondary">
              Condições e responsabilidade no uso de recursos pedagógicos
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-foreground/90">
          <p className="leading-relaxed">
            Os conteúdos pedagógicos disponibilizados durante os programas do IPAV apenas se destinam ao <strong>uso pedagógico</strong> e sob orientação do(s) formador(es) dos mesmos.
          </p>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Restrições de uso
            </h3>
            <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
              <li>
                Não poderá ser dado <strong>uso público</strong> aos conteúdos disponibilizados nos programas.
              </li>
              <li>
                Não é permitido <strong>disseminar ou difundir</strong> os mesmos sem autorização explícita por parte do IPAV.
              </li>
              <li>
                A proteção visa salvaguardar a <strong>identidade de cada interveniente</strong>, conforme Lei de Proteção de Dados (RGPD).
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Rodapé informativo */}
      <div className="rounded-lg bg-muted/40 p-4 text-center text-sm text-muted-foreground">
        Para mais esclarecimentos ou pedidos de autorização, contacte a Direção do IPAV.
      </div>
    </div>
  );
}
