import { createFileRoute } from "@tanstack/react-router";

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
    <div className="mx-auto max-w-3xl py-4 space-y-12">
      <h1 className="font-serif text-4xl md:text-5xl font-normal leading-tight text-foreground">
        Metodologia Ubuntu, produtos e terminologia
      </h1>

      <section className="space-y-4 text-foreground leading-relaxed">
        <h2 className="font-semibold">Regulamento</h2>
        <p>
          A metodologia Ubuntu e todos os produtos e terminologia através dela desenvolvidos, são propriedade do IPAV e estão protegidos por direitos de autor.
        </p>
        <p>
          A utilização da metodologia, no todo ou em parte, bem como de qualquer elemento, produto ou terminologia dela decorrentes, terá que ser expressamente autorizada pelo Direção do IPAV.
        </p>
        <p>
          Qualquer utilização não autorizada merecerá, da parte do IPAV, todos os procedimentos legais, civis e criminais, considerados adequados para repor a justiça.
        </p>
      </section>

      <section className="space-y-4 leading-relaxed">
        <h2 className="font-semibold">Condições e responsabilidade no uso de recurso pedagógicos</h2>
        <p className="italic text-foreground/90">
          Os conteúdos pedagógicos disponibilizados durante os programas do IPAV apenas se destinam ao uso pedagógico e sob orientação do(s) formador(es) dos mesmos. Nesse contexto, para os efeitos legais aplicáveis, que não poderá ser dado uso público aos conteúdos disponibilizados nos programas, disseminar ou difundir os mesmos sem autorização explicíta por parte do IPAV, protegendo assim a identidade de cada interveniente, conforme Lei de Proteção de Dados (RGPD).
        </p>
      </section>
    </div>
  );
}
