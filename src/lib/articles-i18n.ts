export type Lang = "pt" | "en";
export interface I18nText { pt: string; en: string }

export function tx(field: I18nText, lang: Lang): string {
  return field?.[lang] ?? field?.pt ?? "";
}

const dict: Record<string, Record<Lang, string>> = {
  "dashboard.title": { pt: "Dashboard de Conclusões Científicas", en: "Scientific Conclusions Dashboard" },
  "dashboard.subtitle": { pt: "Conselho Científico da Academia de Líderes Ubuntu", en: "Scientific Council of the Ubuntu Leaders Academy" },
  "dashboard.editions": { pt: "Edições", en: "Issues" },
  "dashboard.articles": { pt: "Artigos", en: "Articles" },
  "dashboard.pages": { pt: "Páginas", en: "Pages" },
  "filter.search": { pt: "Pesquisar por título, autor ou palavra-chave...", en: "Search..." },
  "filter.filters": { pt: "Filtros:", en: "Filters:" },
  "filter.clear": { pt: "Limpar", en: "Clear" },
  "filter.noResults": { pt: "Nenhum artigo encontrado.", en: "No articles found." },
  "filter.methodology": { pt: "Metodologia", en: "Methodology" },
  "filter.sample": { pt: "Público-Alvo", en: "Target Audience" },
  "filter.author": { pt: "Autor", en: "Author" },
  "filter.impactArea": { pt: "Área de Impacto", en: "Impact Area" },
  "result.positive": { pt: "Resultado Positivo", en: "Positive Result" },
  "result.exploratory": { pt: "Exploratório", en: "Exploratory" },
  "result.reflective": { pt: "Reflexivo", en: "Reflective" },
  "detail.noSelection": { pt: "Nenhum artigo selecionado", en: "No article selected" },
  "detail.noSelectionHint": { pt: "Selecione um artigo da lista.", en: "Select an article from the list." },
  "detail.methodology": { pt: "Metodologia", en: "Methodology" },
  "detail.methodologyDetail": { pt: "Detalhes Metodológicos", en: "Methodological Details" },
  "detail.sample": { pt: "Amostra", en: "Sample" },
  "detail.sampleDetail": { pt: "Descrição da Amostra", en: "Sample Description" },
  "detail.instruments": { pt: "Instrumentos", en: "Instruments" },
  "detail.pages": { pt: "Páginas", en: "Pages" },
  "detail.impactArea": { pt: "Área de Impacto", en: "Impact Area" },
  "detail.abstract": { pt: "Resumo", en: "Abstract" },
  "detail.objectives": { pt: "Objetivos", en: "Objectives" },
  "detail.keyFindings": { pt: "Resultados Principais", en: "Key Findings" },
  "detail.mainResults": { pt: "Resultados Detalhados", en: "Detailed Results" },
  "detail.conclusion": { pt: "Conclusão", en: "Conclusion" },
  "detail.limitations": { pt: "Limitações", en: "Limitations" },
  "detail.recommendations": { pt: "Recomendações", en: "Recommendations" },
  "detail.keywords": { pt: "Palavras-Chave", en: "Keywords" },
  "detail.source": { pt: "Fonte", en: "Source" },
  "detail.references": { pt: "Referências", en: "References" },
  "detail.viewFull": { pt: "Ver página completa →", en: "View full page →" },
  "detail.viewDetails": { pt: "Ver detalhes →", en: "View details →" },
  "nav.back": { pt: "Voltar", en: "Back" },
  "nav.notFound": { pt: "Artigo não encontrado", en: "Article not found" },
};

export function tk(key: string, lang: Lang): string {
  return dict[key]?.[lang] ?? key;
}
