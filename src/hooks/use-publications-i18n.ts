import { useCallback, useEffect, useState } from "react";
import { tk, type Lang } from "@/lib/articles-i18n";

const KEY = "publications.lang";

export function usePublicationsI18n() {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "pt";
    return (localStorage.getItem(KEY) as Lang) ?? "pt";
  });

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const t = useCallback((key: string) => tk(key, lang), [lang]);

  return { lang, setLang, t };
}
