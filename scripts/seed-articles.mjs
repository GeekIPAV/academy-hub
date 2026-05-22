#!/usr/bin/env bun
// One-off seeder: reads scripts/seed-articles-source.ts and emits SQL to stdout.
import { articles, issuesMeta } from "./seed-articles-source.ts";

const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const arr = (xs) => "ARRAY[" + (xs ?? []).map(esc).join(",") + "]::text[]";
const txArr = (xs) => arr((xs ?? []).map((o) => (typeof o === "string" ? o : o.pt)));
const txArrEn = (xs) => arr((xs ?? []).map((o) => (typeof o === "string" ? o : o.en)));

console.log("BEGIN;");
console.log("TRUNCATE public.articles, public.issues_meta;");

for (const m of issuesMeta) {
  console.log(
    `INSERT INTO public.issues_meta(issue,year,total_articles,pages,issn) VALUES (${m.issue},${m.year},${m.totalArticles},${m.pages},${esc(m.issn)});`,
  );
}

for (const a of articles) {
  const cols = [
    a.id, a.issue, a.year,
    esc(a.title.pt), esc(a.title.en),
    esc(a.subtitle.pt), esc(a.subtitle.en),
    arr(a.authors), arr(a.affiliations),
    esc(a.language),
    esc(a.abstract.pt), esc(a.abstract.en),
    txArr(a.objectives), txArrEn(a.objectives),
    esc(a.methodology.pt), esc(a.methodology.en),
    esc(a.methodologyDetail.pt), esc(a.methodologyDetail.en),
    esc(a.sampleType.pt), esc(a.sampleType.en),
    esc(a.sampleDetail.pt), esc(a.sampleDetail.en),
    txArr(a.instruments), txArrEn(a.instruments),
    esc(a.pages),
    txArr(a.keyFindings), txArrEn(a.keyFindings),
    esc(a.mainResults.pt), esc(a.mainResults.en),
    esc(a.limitations.pt), esc(a.limitations.en),
    esc(a.recommendations.pt), esc(a.recommendations.en),
    esc(a.conclusion.pt), esc(a.conclusion.en),
    txArr(a.tags), txArrEn(a.tags),
    esc(a.impactArea.pt), esc(a.impactArea.en),
    esc(a.resultType),
    arr(a.references),
  ].join(",");
  console.log(
    `INSERT INTO public.articles(id,issue,year,title_pt,title_en,subtitle_pt,subtitle_en,authors,affiliations,language,abstract_pt,abstract_en,objectives_pt,objectives_en,methodology_pt,methodology_en,methodology_detail_pt,methodology_detail_en,sample_type_pt,sample_type_en,sample_detail_pt,sample_detail_en,instruments_pt,instruments_en,pages,key_findings_pt,key_findings_en,main_results_pt,main_results_en,limitations_pt,limitations_en,recommendations_pt,recommendations_en,conclusion_pt,conclusion_en,tags_pt,tags_en,impact_area_pt,impact_area_en,result_type,"references") VALUES (${cols});`,
  );
}
console.log("COMMIT;");
