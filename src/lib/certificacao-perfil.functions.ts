import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const certSchema = z.object({
  first_names: z.string().trim().min(1).max(120),
  last_names: z.string().trim().min(1).max(120),
  gender: z.string().trim().min(1).max(40),
  birth_date: z.string().trim().min(1),
  nif: z.string().trim().min(1).max(20),
  id_doc_type: z.string().trim().min(1).max(40),
  id_doc_number: z.string().trim().min(1).max(40),
  id_doc_expiry: z.string().trim().min(1),
  nationality_country: z.string().trim().min(1).max(120),
  origin_country: z.string().trim().min(1).max(120),
  birth_concelho: z.string().trim().min(1).max(120),
  residence_concelho: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(255),
  address_cp4: z.string().trim().regex(/^\d{4}$/, "4 dígitos"),
  address_cp3: z.string().trim().regex(/^\d{3}$/, "3 dígitos"),
  locality: z.string().trim().min(1).max(120),
  education_level: z.string().trim().min(1).max(120),
  job_title: z.string().trim().min(1).max(120),
  funcao_laboral_detalhe: z.string().trim().max(255).optional().nullable(),
  work_institution: z.string().trim().min(1).max(255),
  phone: z.string().trim().max(40).optional().nullable(),
  cedula_profissional: z.string().trim().max(60).optional().nullable(),
  grupo_recrutamento: z.string().trim().max(120).optional().nullable(),
  escola_educando: z.string().trim().max(255).optional().nullable(),
  data_consent: z.boolean(),
});

export type CertificacaoData = z.infer<typeof certSchema>;

export const REQUIRED_CERT_FIELDS = [
  "first_names","last_names","gender","birth_date","nif","id_doc_type","id_doc_number",
  "id_doc_expiry","nationality_country","origin_country","birth_concelho","residence_concelho",
  "address","address_cp4","address_cp3","locality","education_level","job_title","work_institution",
] as const;

export const getMeuPerfilCertificacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("utilizadores")
      .select(
        "first_names,last_names,full_name,email,gender,birth_date,nif,id_doc_type,id_doc_number,id_doc_expiry,nationality_country,origin_country,birth_concelho,residence_concelho,address,address_cp4,address_cp3,locality,education_level,job_title,funcao_laboral_detalhe,work_institution,phone,cedula_profissional,grupo_recrutamento,escola_educando,data_consent",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

export const saveMeuPerfilCertificacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => certSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!data.data_consent) {
      throw new Error("É necessário consentir o tratamento de dados.");
    }
    const full_name = `${data.first_names} ${data.last_names}`.trim();
    const { error } = await context.supabase
      .from("utilizadores")
      .update({ ...data, full_name })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export function isCertCompleto(p: Record<string, unknown> | null | undefined): boolean {
  if (!p) return false;
  if (!p.data_consent) return false;
  for (const k of REQUIRED_CERT_FIELDS) {
    const v = p[k];
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return false;
  }
  return true;
}
