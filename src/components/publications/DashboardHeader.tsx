import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { useArticles, useIssuesMeta } from "@/hooks/use-articles";
import { usePublicationsI18n } from "@/hooks/use-publications-i18n";

export function DashboardHeader() {
  const { t, lang, setLang } = usePublicationsI18n();
  const { data: articles = [] } = useArticles();
  const { data: issuesMeta = [] } = useIssuesMeta();
  const totalArticles = articles.length;
  const totalPages = issuesMeta.reduce((s, i) => s + i.pages, 0);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="border-b border-border pb-6 mb-8"
    >
      <div className="flex items-baseline justify-between flex-wrap gap-4">
        <div>
          <span className="text-label mb-1 block">{t("dashboard.title")}</span>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
            Ubuntu: Revista de Ciências Sociais e Humanas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setLang(lang === "pt" ? "en" : "pt")}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-primary/10 transition-colors text-foreground"
            title={lang === "pt" ? "Switch to English" : "Mudar para Português"}
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === "pt" ? "EN" : "PT"}
          </button>
          <div className="w-px h-8 bg-spine" />
          <div className="text-right">
            <span className="text-label block">{t("dashboard.editions")}</span>
            <span className="font-mono-data text-xl font-medium text-foreground">
              {String(issuesMeta.length).padStart(2, "0")}
            </span>
          </div>
          <div className="w-px h-8 bg-spine" />
          <div className="text-right">
            <span className="text-label block">{t("dashboard.articles")}</span>
            <span className="font-mono-data text-xl font-medium text-foreground">
              {String(totalArticles).padStart(2, "0")}
            </span>
          </div>
          <div className="w-px h-8 bg-spine" />
          <div className="text-right">
            <span className="text-label block">{t("dashboard.pages")}</span>
            <span className="font-mono-data text-xl font-medium text-foreground">{totalPages}</span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
