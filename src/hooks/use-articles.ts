import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { I18nText } from "@/lib/articles-i18n";

export interface Article {
  id: number; issue: number; year: number;
  title: I18nText; subtitle: I18nText;
  authors: string[]; affiliations: string[]; language: "pt" | "en";
  abstract: I18nText; objectives: I18nText[];
  methodology: I18nText; methodologyDetail: I18nText;
  sampleType: I18nText; sampleDetail: I18nText;
  instruments: I18nText[]; pages: string;
  keyFindings: I18nText[]; mainResults: I18nText;
  limitations: I18nText; recommendations: I18nText;
  conclusion: I18nText; tags: I18nText[];
  impactArea: I18nText;
  resultType: "positive" | "exploratory" | "reflective";
  references: string[];
}

export interface IssueMeta { issue: number; year: number; total_articles: number; pages: number; issn: string }

type Row = Record<string, any>;
const pair = (r: Row, k: string): I18nText => ({ pt: r[`${k}_pt`] ?? "", en: r[`${k}_en`] ?? "" });
const arr = (r: Row, k: string): I18nText[] => {
  const pt: string[] = r[`${k}_pt`] ?? [];
  const en: string[] = r[`${k}_en`] ?? [];
  return pt.map((p, i) => ({ pt: p, en: en[i] ?? p }));
};

function map(r: Row): Article {
  return {
    id: r.id, issue: r.issue, year: r.year,
    title: pair(r, "title"), subtitle: pair(r, "subtitle"),
    authors: r.authors ?? [], affiliations: r.affiliations ?? [], language: r.language,
    abstract: pair(r, "abstract"), objectives: arr(r, "objectives"),
    methodology: pair(r, "methodology"), methodologyDetail: pair(r, "methodology_detail"),
    sampleType: pair(r, "sample_type"), sampleDetail: pair(r, "sample_detail"),
    instruments: arr(r, "instruments"), pages: r.pages,
    keyFindings: arr(r, "key_findings"), mainResults: pair(r, "main_results"),
    limitations: pair(r, "limitations"), recommendations: pair(r, "recommendations"),
    conclusion: pair(r, "conclusion"), tags: arr(r, "tags"),
    impactArea: pair(r, "impact_area"),
    resultType: r.result_type, references: r.references ?? [],
  };
}

export function useArticles() {
  return useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").order("id");
      if (error) throw error;
      return (data ?? []).map(map);
    },
  });
}

export function useArticle(id: number) {
  return useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").eq("id", id).single();
      if (error) throw error;
      return map(data);
    },
    enabled: !!id,
  });
}

export function useIssuesMeta() {
  return useQuery({
    queryKey: ["issues_meta"],
    queryFn: async () => {
      const { data, error } = await supabase.from("issues_meta").select("*").order("issue");
      if (error) throw error;
      return (data ?? []) as IssueMeta[];
    },
  });
}
