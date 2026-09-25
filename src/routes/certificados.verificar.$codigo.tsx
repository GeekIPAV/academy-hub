import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, ShieldX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { verificarCertificado } from "@/lib/elearning.functions";

export const Route = createFileRoute("/certificados/verificar/$codigo")({
  loader: ({ params }) => verificarCertificado({ data: { codigo: params.codigo } }),
  head: ({ params }) => ({
    meta: [
      { title: `Verificação de certificado ${params.codigo} — Academia Ubuntu` },
      { name: "description", content: "Confirme a autenticidade de um certificado da Escola Ubuntu Online." },
      { property: "og:title", content: "Verificação de certificado — Academia Ubuntu" },
      { property: "og:description", content: "Confirme a autenticidade de um certificado da Escola Ubuntu Online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => <p className="p-8 text-center text-sm text-muted-foreground">Não foi possível verificar o certificado.</p>,
  notFoundComponent: () => <p className="p-8 text-center text-sm text-muted-foreground">Certificado não encontrado.</p>,
  component: VerificarPage,
});

function fmt(d: string | null) {
  return d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" }) : "—";
}

function VerificarPage() {
  const c = Route.useLoaderData();
  const { codigo } = Route.useParams();
  const valido = c && !c.revogado;
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card className="space-y-4 p-8 text-center">
        {valido ? <BadgeCheck className="mx-auto h-12 w-12 text-primary" /> : <ShieldX className="mx-auto h-12 w-12 text-destructive" />}
        <h1 className="text-xl font-semibold">{valido ? "Certificado válido" : c ? "Certificado revogado" : "Certificado não encontrado"}</h1>
        <p className="font-mono text-xs text-muted-foreground">{codigo}</p>
        {c && (
          <dl className="space-y-2 text-left text-sm">
            <div><dt className="text-xs text-muted-foreground">Nome</dt><dd className="font-medium">{c.nome}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Curso</dt><dd className="font-medium">{c.curso_titulo}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Modalidade</dt><dd>{c.modalidade ?? "—"}</dd></div>
            {c.horas ? <div><dt className="text-xs text-muted-foreground">Horas de formação</dt><dd>{c.horas} h</dd></div> : null}
            <div><dt className="text-xs text-muted-foreground">Período</dt><dd>{fmt(c.data_inicio)} a {fmt(c.data_fim)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Emitido em</dt><dd>{fmt(c.emitido_em)}</dd></div>
          </dl>
        )}
        <p className="text-xs text-muted-foreground">Academia de Líderes Ubuntu · Escola Ubuntu Online</p>
      </Card>
    </div>
  );
}
