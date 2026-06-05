import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/components/publications/DashboardHeader";
import { ArticleCard } from "@/components/publications/ArticleCard";
import { ArticleDetail } from "@/components/publications/ArticleDetail";
import { FilterBar, emptyFilters, type Filters } from "@/components/publications/FilterBar";
import { useArticles } from "@/hooks/use-articles";
import { tx } from "@/lib/articles-i18n";
import { usePublicationsI18n } from "@/hooks/use-publications-i18n";
import { RouteGate } from "@/components/RouteGate";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";


export const Route = createFileRoute("/publicacoes/revistas")({
  head: () => ({
    meta: [
      { title: "Revistas Científicas — Ubuntu" },
      { name: "description", content: "Revista Ubuntu — artigos de ciências sociais e humanas." },
    ],
  }),
  component: () => (
    <RouteGate path="/publicacoes/revistas">
      <RevistasPage />
    </RouteGate>
  ),
});


function RevistasPage() {
  const { t, lang } = usePublicationsI18n();
  const { data: articles = [], isLoading } = useArticles();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });

  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (filters.issue && a.issue !== filters.issue) return false;
      if (filters.resultType && a.resultType !== filters.resultType) return false;
      if (filters.language && a.language !== filters.language) return false;
      if (filters.methodology && tx(a.methodology, lang) !== filters.methodology) return false;
      if (filters.sampleType && tx(a.sampleType, lang) !== filters.sampleType) return false;
      if (filters.author && !a.authors.includes(filters.author)) return false;
      if (filters.impactArea && tx(a.impactArea, lang) !== filters.impactArea) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = [
          tx(a.title, lang), tx(a.subtitle, lang),
          ...a.authors, ...a.tags.map((tag) => tx(tag, lang)),
          tx(a.impactArea, lang), tx(a.methodology, lang), tx(a.sampleType, lang),
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [filters, lang, articles]);

  const selectedArticle =
    filteredArticles.find((a) => a.id === selectedId) ?? filteredArticles[0] ?? null;

  return (
    <div className="bg-background">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <ComponentAccessMatrix pagePath="/publicacoes/revistas" />
        <DashboardHeader />
        <FilterBar filters={filters} onChange={setFilters} />

        {isLoading ? (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-[380px] shrink-0 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
            <div className="flex-1 space-y-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-[380px] shrink-0 space-y-3 lg:max-h-[calc(100vh-380px)] lg:overflow-y-auto lg:pr-2">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center gap-3">
                  <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{t("filter.noResults")}</p>
                  <button
                    onClick={() => setFilters({ ...emptyFilters })}
                    className="text-xs text-primary hover:underline"
                  >
                    {t("filter.clearAll")}
                  </button>
                </div>
              ) : (
                filteredArticles.map((article, i) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    index={i}
                    isSelected={selectedArticle?.id === article.id}
                    onClick={() => setSelectedId(article.id)}
                  />
                ))
              )}
            </div>
            <div className="flex-1 spine-line lg:pl-8 min-w-0">
              <ArticleDetail article={selectedArticle} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
