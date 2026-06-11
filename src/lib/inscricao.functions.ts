import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isCertCompleto } from "./certificacao-perfil.functions";

const tokenSchema = z.object({ token: z.string().trim().min(4).max(128) });

export const getCohortByToken = createServerFn({ method: "GET" })
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("entidades_programas")
      .select(
        "id, is_active, entity_id, program_id, entidades(name), programas(title, enrollment_open, cluster_id, clusters(info_pdf_url))",
      )
      .eq("invite_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      cohort_id: row.id,
      is_active: row.is_active,
      entity_name: row.entidades?.name ?? null,
      program_title: row.programas?.title ?? null,
      enrollment_open: row.programas?.enrollment_open ?? false,
      info_pdf_url: row.programas?.clusters?.info_pdf_url ?? null,
    };
  });

export const enrollWithToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Verificar que o utilizador já preencheu os dados de certificação
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("utilizadores")
      .select(
        "first_names,last_names,gender,birth_date,nif,id_doc_type,id_doc_number,id_doc_expiry,nationality_country,origin_country,birth_concelho,residence_concelho,address,address_cp4,address_cp3,locality,education_level,job_title,work_institution,data_consent",
      )
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!isCertCompleto(profile)) {
      throw new Error("Preenche os dados de certificação antes de te inscreveres.");
    }

    const { data: cohort, error: cErr } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, is_active, program_id, programas(enrollment_open, cluster_id)")
      .eq("invite_token", data.token)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cohort) throw new Error("Link de inscrição inválido.");
    if (cohort.is_active === false)
      throw new Error("Esta inscrição já não está ativa.");

    const enrollmentOpen = cohort.programas?.enrollment_open ?? false;
    const status = enrollmentOpen ? "aprovada" : "lista_espera";

    const { data: existing } = await supabaseAdmin
      .from("inscritos_programa")
      .select("id, status")
      .eq("cohort_id", cohort.id)
      .eq("user_id", userId)
      .maybeSingle();

    let enrollmentId = existing?.id;
    let alreadyEnrolled = false;
    let finalStatus = existing?.status ?? status;

    if (existing) {
      alreadyEnrolled = true;
    } else {
      const { data: inserted, error: iErr } = await supabaseAdmin
        .from("inscritos_programa")
        .insert({ cohort_id: cohort.id, user_id: userId, status })
        .select("id")
        .maybeSingle();
      if (iErr) throw new Error(iErr.message);
      enrollmentId = inserted?.id;
      finalStatus = status;
    }

    const clusterId = cohort.programas?.cluster_id ?? null;
    if (clusterId) {
      const { data: cluster } = await supabaseAdmin
        .from("clusters")
        .select("formando_badge_id")
        .eq("id", clusterId)
        .maybeSingle();
      const formandoBadgeId = cluster?.formando_badge_id ?? null;
      if (formandoBadgeId) {
        await supabaseAdmin
          .from("user_badges")
          .upsert(
            { user_id: userId, badge_id: formandoBadgeId },
            { onConflict: "user_id,badge_id", ignoreDuplicates: true },
          );
      }
    }

    return {
      ok: true,
      alreadyEnrolled,
      id: enrollmentId,
      status: finalStatus,
      waitlisted: finalStatus === "lista_espera",
    };
  });

