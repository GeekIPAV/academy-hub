import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Article } from "@/hooks/use-articles";
import { tx } from "@/lib/articles-i18n";
import { usePublicationsI18n } from "@/hooks/use-publications-i18n";

interface Props {
  article: Article;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export function ArticleCard({ article, index, isSelected, onClick }: Props) {
  const { t, lang } = usePublicationsI18n();

  const resultTypeColor: Record<Article["resultType"], string> = {
    positive: "text-metric-positive",
    exploratory: "text-primary",
    reflective: "text-muted-foreground",
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`insight-card text-left w-full cursor-pointer group ${
        isSelected ? "outline outline-2 outline-primary outline-offset-[-2px]" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-label">n.º {article.issue}</span>
          <span className="text-[9px] text-muted-foreground font-mono-data">{article.year}</span>
        </div>
        <span className={`text-label ${resultTypeColor[article.resultType]}`}>
          {t(`result.${article.resultType}`)}
        </span>
      </div>

      <h3 className="font-display text-lg font-medium text-foreground leading-snug mt-1 group-hover:text-primary transition-colors duration-200">
        {tx(article.title, lang)}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">
        {tx(article.subtitle, lang)}
      </p>
      <p className="text-xs text-muted-foreground mt-2">{article.authors.join(", ")}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {article.tags.slice(0, 3).map((tag, i) => (
          <span key={i} className="metric-tag">{tx(tag, lang)}</span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-label">{t("detail.methodology")}</span>
            <span className="font-mono-data text-xs font-medium text-foreground mt-0.5 line-clamp-1">
              {tx(article.methodology, lang)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-label">{t("detail.pages")}</span>
            <span className="font-mono-data text-xs font-medium text-foreground mt-0.5">
              {article.pages}
            </span>
          </div>
        </div>
        <Link
          to="/publicacoes/revistas/$id"
          params={{ id: String(article.id) }}
          className="inline-flex items-center gap-1 text-xs text-primary font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {t("detail.viewDetails")}
          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </Link>
      </div>
    </motion.button>
  );
}
