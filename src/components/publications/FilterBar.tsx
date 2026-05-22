import { useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { tx } from "@/lib/articles-i18n";
import { usePublicationsI18n } from "@/hooks/use-publications-i18n";
import { useArticles, useIssuesMeta, type Article } from "@/hooks/use-articles";

export interface Filters {
  search: string;
  issue: number | null;
  resultType: string | null;
  language: string | null;
  methodology: string | null;
  sampleType: string | null;
  author: string | null;
  impactArea: string | null;
}

export const emptyFilters: Filters = {
  search: "",
  issue: null,
  resultType: null,
  language: null,
  methodology: null,
  sampleType: null,
  author: null,
  impactArea: null,
};

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

function DropdownFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (val: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
          value ? "bg-primary text-primary-foreground" : "metric-tag hover:bg-primary/10"
        }`}
      >
        {value ? <span className="max-w-[120px] truncate">{value}</span> : label}
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-[8px] shadow-lg max-h-[240px] overflow-y-auto min-w-[200px]">
            {value && (
              <button
                onClick={() => { onChange(null); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 border-b border-border"
              >
                ✕ {label}
              </button>
            )}
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-primary/5 transition-colors ${
                  value === opt ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const { t, lang } = usePublicationsI18n();
  const { data: articles = [] } = useArticles();
  const { data: issuesMeta = [] } = useIssuesMeta();
  const hasFilters = Object.entries(filters).some(([k, v]) =>
    k === "search" ? !!v : v !== null
  );

  const uniqueMethodologies = [...new Set(articles.map((a: Article) => tx(a.methodology, lang)))].sort();
  const uniqueAuthors = [...new Set(articles.flatMap((a: Article) => a.authors))].sort();
  const uniqueImpactAreas = [...new Set(articles.map((a: Article) => tx(a.impactArea, lang)))].sort();
  const uniqueSampleTypes = [...new Set(articles.map((a: Article) => tx(a.sampleType, lang)))].sort();

  const resultTypes = [
    { value: "positive", label: t("result.positive") },
    { value: "exploratory", label: t("result.exploratory") },
    { value: "reflective", label: t("result.reflective") },
  ];

  const languages = [
    { value: "pt", label: t("lang.pt") },
    { value: "en", label: t("lang.en") },
  ];

  return (
    <div className="space-y-3 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("filter.search")}
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-sunken border border-border rounded-[8px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-label mr-1">{t("filter.filters")}</span>

        {issuesMeta.map((m) => (
          <button
            key={m.issue}
            onClick={() =>
              onChange({ ...filters, issue: filters.issue === m.issue ? null : m.issue })
            }
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              filters.issue === m.issue
                ? "bg-primary text-primary-foreground"
                : "metric-tag hover:bg-primary/10"
            }`}
          >
            n.º {m.issue} ({m.year})
          </button>
        ))}

        <div className="w-px h-4 bg-spine mx-1" />

        {resultTypes.map((rt) => (
          <button
            key={rt.value}
            onClick={() =>
              onChange({
                ...filters,
                resultType: filters.resultType === rt.value ? null : rt.value,
              })
            }
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              filters.resultType === rt.value
                ? "bg-primary text-primary-foreground"
                : "metric-tag hover:bg-primary/10"
            }`}
          >
            {rt.label}
          </button>
        ))}

        <div className="w-px h-4 bg-spine mx-1" />

        {languages.map((l) => (
          <button
            key={l.value}
            onClick={() =>
              onChange({
                ...filters,
                language: filters.language === l.value ? null : l.value,
              })
            }
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              filters.language === l.value
                ? "bg-primary text-primary-foreground"
                : "metric-tag hover:bg-primary/10"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <DropdownFilter label={t("filter.methodology")} value={filters.methodology} options={uniqueMethodologies} onChange={(v) => onChange({ ...filters, methodology: v })} />
        <DropdownFilter label={t("filter.sample")} value={filters.sampleType} options={uniqueSampleTypes} onChange={(v) => onChange({ ...filters, sampleType: v })} />
        <DropdownFilter label={t("filter.author")} value={filters.author} options={uniqueAuthors} onChange={(v) => onChange({ ...filters, author: v })} />
        <DropdownFilter label={t("filter.impactArea")} value={filters.impactArea} options={uniqueImpactAreas} onChange={(v) => onChange({ ...filters, impactArea: v })} />

        {hasFilters && (
          <>
            <div className="w-px h-4 bg-spine mx-1" />
            <button
              onClick={() => onChange({ ...emptyFilters })}
              className="text-xs px-2 py-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              {t("filter.clear")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
