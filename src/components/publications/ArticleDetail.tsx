import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import type { Article } from "@/hooks/use-articles";
import { tx } from "@/lib/articles-i18n";
import { usePublicationsI18n } from "@/hooks/use-publications-i18n";

interface Props {
  article: Article | null;
}

export function ArticleDetail({ article }: Props) {
  const { t, lang } = usePublicationsI18n();

  const resultTypeBadge: Record<string, { label: string; className: string }> = {
    positive: { label: t("result.positive"), className: "bg-accent/20 text-accent-foreground" },
    exploratory: { label: t("result.exploratory"), className: "bg-primary/10 text-primary" },
    reflective: { label: t("result.reflective"), className: "bg-muted text-muted-foreground" },
  };

  if (!article) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <p className="text-label mb-2">{t("detail.noSelection")}</p>
          <p className="text-sm text-muted-foreground max-w-[30ch] mx-auto leading-relaxed">
            {t("detail.noSelectionHint")}
          </p>
        </div>
      </div>
    );
  }

  const badge = resultTypeBadge[article.resultType];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={article.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
        <div>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-label">n.º {article.issue} · {article.year}</span>
            <span className={`text-[10px] uppercase tracking-[0.1em] font-bold px-2 py-0.5 rounded-md ${badge.className}`}>
              {badge.label}
            </span>
            <span className="metric-tag">{article.language === "en" ? "English" : "Português"}</span>
            <span className="metric-tag">pp. {article.pages}</span>
          </div>
          <h2 className="font-display text-3xl font-medium text-foreground leading-tight tracking-tight">
            {tx(article.title, lang)}
          </h2>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed max-w-[65ch]">
            {tx(article.subtitle, lang)}
          </p>
          <p className="text-sm text-foreground mt-3 font-medium">{article.authors.join(", ")}</p>
          {article.affiliations.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              {article.affiliations.join(" · ")}
            </p>
          )}
          <Link
            to="/publicacoes/revistas/$id"
            params={{ id: String(article.id) }}
            className="inline-block mt-3 text-xs text-primary hover:underline font-medium"
          >
            {t("detail.viewFull")}
          </Link>
        </div>

        <div className="bg-surface-sunken rounded-[8px] p-4">
          <h3 className="text-label mb-2">{t("detail.abstract")}</h3>
          <p className="text-sm text-foreground leading-relaxed">{tx(article.abstract, lang)}</p>
        </div>

        {article.objectives.length > 0 && (
          <div>
            <h3 className="text-label mb-3">{t("detail.objectives")}</h3>
            <ul className="space-y-1.5">
              {article.objectives.map((obj, i) => (
                <li key={i} className="flex gap-2 items-start text-sm text-foreground leading-relaxed">
                  <span className="text-primary mt-1 shrink-0">•</span>
                  {tx(obj, lang)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricBox label={t("detail.methodology")} value={tx(article.methodology, lang)} />
          <MetricBox label={t("detail.sample")} value={tx(article.sampleType, lang)} />
          <MetricBox label={t("detail.pages")} value={article.pages} mono />
          <MetricBox label={t("detail.impactArea")} value={tx(article.impactArea, lang)} />
        </div>

        <div>
          <h3 className="text-label mb-2">{t("detail.methodologyDetail")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{tx(article.methodologyDetail, lang)}</p>
        </div>

        <div>
          <h3 className="text-label mb-2">{t("detail.sampleDetail")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{tx(article.sampleDetail, lang)}</p>
        </div>

        {article.instruments.length > 0 && (
          <div>
            <h3 className="text-label mb-2">{t("detail.instruments")}</h3>
            <div className="flex flex-wrap gap-2">
              {article.instruments.map((inst, i) => (
                <span key={i} className="metric-tag text-xs">{tx(inst, lang)}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-label mb-4">{t("detail.keyFindings")}</h3>
          <div className="space-y-3">
            {article.keyFindings.map((finding, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex gap-3 items-start"
              >
                <span className="font-mono-data text-xs text-label mt-1 shrink-0 w-5 text-right">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="spine-line pl-4">
                  <p className="text-sm text-foreground leading-relaxed">{tx(finding, lang)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-label mb-2">{t("detail.mainResults")}</h3>
          <p className="text-sm text-foreground leading-relaxed">{tx(article.mainResults, lang)}</p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="surface-elevated border border-border rounded-[12px] p-6"
        >
          <h3 className="text-label mb-3">{t("detail.conclusion")}</h3>
          <p className="font-display text-base text-foreground leading-relaxed italic">
            "{tx(article.conclusion, lang)}"
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface-sunken rounded-[8px] p-4">
            <h3 className="text-label mb-2">{t("detail.limitations")}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{tx(article.limitations, lang)}</p>
          </div>
          <div className="bg-surface-sunken rounded-[8px] p-4">
            <h3 className="text-label mb-2">{t("detail.recommendations")}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{tx(article.recommendations, lang)}</p>
          </div>
        </div>

        <div>
          <h3 className="text-label mb-3">{t("detail.keywords")}</h3>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag, i) => (
              <span key={i} className="metric-tag">{tx(tag, lang)}</span>
            ))}
          </div>
        </div>

        {article.references.length > 0 && (
          <div>
            <h3 className="text-label mb-3">{t("detail.references")}</h3>
            <ul className="space-y-2">
              {article.references.map((ref, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-4 border-l-2 border-border">
                  {ref}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t border-border pt-4">
          <span className="text-label block mb-1">{t("detail.source")}</span>
          Ubuntu: Revista de Ciências Sociais e Humanas, n.º {article.issue}, {article.year}, pp. {article.pages}.
          Conselho Científico da Academia de Líderes Ubuntu. ISSN: 2975-9072.
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function MetricBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-surface-sunken rounded-[8px] p-3">
      <span className="text-label">{label}</span>
      <p className={`text-sm font-medium text-foreground mt-1 ${mono ? "font-mono-data" : ""}`}>
        {value}
      </p>
    </div>
  );
}
