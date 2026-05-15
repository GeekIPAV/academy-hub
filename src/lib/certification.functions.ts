import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/attach-auth-client";

export const getCertificationContext = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: enrollments, error: eErr } = await supabase
      .from("inscritos_programa")
      .select("id, status")
      .eq("user_id", userId);
    if (eErr) throw new Error(eErr.message);

    const { data: profile, error: pErr } = await supabase
      .from("utilizadores")
      .select(
        "full_name, education_level, job_title, work_institution, id_doc_type, id_doc_number, id_doc_expiry, nif, birth_date, nationality_country",
      )
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);

    return {
      isFormando: (enrollments?.length ?? 0) > 0,
      enrollments: enrollments ?? [],
      profile: profile ?? null,
    };
  });

const certSchema = z.object({
  education_level: z.string().trim().min(1).max(120),
  job_title: z.string().trim().min(1).max(120),
  work_institution: z.string().trim().min(1).max(180),
  full_name: z.string().trim().min(2).max(180),
  id_doc_type: z.enum(["CC", "Passaporte"]),
  id_doc_number: z.string().trim().min(2).max(40),
  id_doc_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nif: z.string().trim().min(5).max(20),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nationality_country: z.string().trim().min(2).max(80),
});

export const saveCertificationData = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input) => certSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error: upErr } = await supabase
      .from("utilizadores")
      .update({
        education_level: data.education_level,
        job_title: data.job_title,
        work_institution: data.work_institution,
        full_name: data.full_name,
        id_doc_type: data.id_doc_type,
        id_doc_number: data.id_doc_number,
        id_doc_expiry: data.id_doc_expiry,
        nif: data.nif,
        birth_date: data.birth_date,
        nationality_country: data.nationality_country,
      })
      .eq("id", userId);
    if (upErr) throw new Error(upErr.message);

    const { error: enErr } = await supabase
      .from("inscritos_programa")
      .update({ status: "ativo" })
      .eq("user_id", userId)
      .eq("status", "pendente");
    if (enErr) throw new Error(enErr.message);

    return { ok: true };
  });
