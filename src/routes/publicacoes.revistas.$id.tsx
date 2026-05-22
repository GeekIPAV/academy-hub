import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleDetail } from "@/components/publications/ArticleDetail";
import { useArticle } from "@/hooks/use-articles";
import { usePublicationsI18n } from "@/hooks/use-publications-i18n";

export const Route = createFileRoute("/publicacoes/revistas/$id")({
  head: () => ({ meta: [{ title: "Artigo — Revista Ubuntu" }] }),
  component: ArticlePage,
});

function ArticlePage() {
  const { id } = Route.useParams();
  const { t } = usePublicationsI18n();
  const { data: article, isLoading, error } = useArticle(Number(id));

  return (
    <div className="bg-background">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/publicacoes/revistas"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("nav.back")}
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : error || !article ? (
          <p className="text-sm text-muted-foreground">{t("nav.notFound")}</p>
        ) : (
          <ArticleDetail article={article} />
        )}
      </div>
    </div>
  );
}
