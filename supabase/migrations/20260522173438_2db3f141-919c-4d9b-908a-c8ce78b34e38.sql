
-- Articles table (Revista Ubuntu)
CREATE TABLE public.articles (
  id INTEGER PRIMARY KEY,
  issue INTEGER NOT NULL,
  year INTEGER NOT NULL,
  title_pt TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  subtitle_pt TEXT NOT NULL DEFAULT '',
  subtitle_en TEXT NOT NULL DEFAULT '',
  authors TEXT[] NOT NULL DEFAULT '{}',
  affiliations TEXT[] NOT NULL DEFAULT '{}',
  language TEXT NOT NULL CHECK (language IN ('pt','en')),
  abstract_pt TEXT NOT NULL DEFAULT '',
  abstract_en TEXT NOT NULL DEFAULT '',
  objectives_pt TEXT[] NOT NULL DEFAULT '{}',
  objectives_en TEXT[] NOT NULL DEFAULT '{}',
  methodology_pt TEXT NOT NULL DEFAULT '',
  methodology_en TEXT NOT NULL DEFAULT '',
  methodology_detail_pt TEXT NOT NULL DEFAULT '',
  methodology_detail_en TEXT NOT NULL DEFAULT '',
  sample_type_pt TEXT NOT NULL DEFAULT '',
  sample_type_en TEXT NOT NULL DEFAULT '',
  sample_detail_pt TEXT NOT NULL DEFAULT '',
  sample_detail_en TEXT NOT NULL DEFAULT '',
  instruments_pt TEXT[] NOT NULL DEFAULT '{}',
  instruments_en TEXT[] NOT NULL DEFAULT '{}',
  pages TEXT NOT NULL DEFAULT '',
  key_findings_pt TEXT[] NOT NULL DEFAULT '{}',
  key_findings_en TEXT[] NOT NULL DEFAULT '{}',
  main_results_pt TEXT NOT NULL DEFAULT '',
  main_results_en TEXT NOT NULL DEFAULT '',
  limitations_pt TEXT NOT NULL DEFAULT '',
  limitations_en TEXT NOT NULL DEFAULT '',
  recommendations_pt TEXT NOT NULL DEFAULT '',
  recommendations_en TEXT NOT NULL DEFAULT '',
  conclusion_pt TEXT NOT NULL DEFAULT '',
  conclusion_en TEXT NOT NULL DEFAULT '',
  tags_pt TEXT[] NOT NULL DEFAULT '{}',
  tags_en TEXT[] NOT NULL DEFAULT '{}',
  impact_area_pt TEXT NOT NULL DEFAULT '',
  impact_area_en TEXT NOT NULL DEFAULT '',
  result_type TEXT NOT NULL CHECK (result_type IN ('positive','exploratory','reflective')),
  "references" TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Articles are publicly readable"
  ON public.articles FOR SELECT USING (true);

CREATE POLICY "Admins manage articles"
  ON public.articles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Issues meta table
CREATE TABLE public.issues_meta (
  issue INTEGER PRIMARY KEY,
  year INTEGER NOT NULL,
  total_articles INTEGER NOT NULL,
  pages INTEGER NOT NULL,
  issn TEXT NOT NULL
);

ALTER TABLE public.issues_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issues meta is publicly readable"
  ON public.issues_meta FOR SELECT USING (true);

CREATE POLICY "Admins manage issues meta"
  ON public.issues_meta FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
