import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/attach-auth-client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const clusterIdSchema = z.object({ cluster_id: z.string().uuid() });

export const getClusterEnrollmentInfo = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((i) => clusterIdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: user } = await supabaseAdmin
      .from("utilizadores")
      .select("entity_id, full_name, email")
      .eq("id", userId)
      .maybeSingle();

    const { data: cluster, error: cErr } = await supabaseAdmin
      .from("clusters")
      .select("id, name, info_pdf_url")
      .eq("id", data.cluster_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cluster) throw new Error("Cluster não encontrado.");

    const { data: programs, error: pErr } = await supabaseAdmin
      .from("programas")
      .select("id, title, enrollment_open, is_active")
      .eq("cluster_id", data.cluster_id)
      .eq("is_active", true);
    if (pErr) throw new Error(pErr.message);

    let existing: Array<{ program_id: string; status: string }> = [];
    if (user?.entity_id) {
      const { data: enr } = await supabaseAdmin
        .from("inscricoes_entidade_programa")
        .select("program_id, status")
        .eq("entity_id", user.entity_id)
        .in("program_id", (programs ?? []).map((p) => p.id));
      existing = (enr ?? []).map((e) => ({ program_id: e.program_id, status: e.status }));
    }

    return {
      cluster: { id: cluster.id, name: cluster.name, info_pdf_url: cluster.info_pdf_url },
      programs: (programs ?? []).map((p) => {
        const e = existing.find((x) => x.program_id === p.id);
        return {
          id: p.id,
          title: p.title,
          enrollment_open: p.enrollment_open ?? false,
          enrollment_status: e?.status ?? null,
        };
      }),
      has_entity: !!user?.entity_id,
    };
  });

const enrollSchema = z.object({
  cluster_id: z.string().uuid(),
  program_ids: z.array(z.string().uuid()).min(1).max(20),
});

export const enrollEntityInPrograms = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((i) => enrollSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: user, error: uErr } = await supabaseAdmin
      .from("utilizadores")
      .select("entity_id, full_name, email")
      .eq("id", userId)
      .maybeSingle();
    if (uErr) throw new Error(uErr.message);
    if (!user?.entity_id) throw new Error("Não estás associado a nenhuma entidade.");

    const { data: entity } = await supabaseAdmin
      .from("entidades")
      .select("name, contact_email")
      .eq("id", user.entity_id)
      .maybeSingle();

    const { data: programs, error: pErr } = await supabaseAdmin
      .from("programas")
      .select("id, title, enrollment_open, cluster_id")
      .in("id", data.program_ids);
    if (pErr) throw new Error(pErr.message);

    const valid = (programs ?? []).filter(
      (p) => p.cluster_id === data.cluster_id && p.enrollment_open,
    );
    if (valid.length === 0) throw new Error("Nenhum programa válido selecionado.");

    // Check duplicates
    const { data: existing } = await supabaseAdmin
      .from("inscricoes_entidade_programa")
      .select("program_id")
      .eq("entity_id", user.entity_id)
      .in("program_id", valid.map((p) => p.id));
    const already = new Set((existing ?? []).map((e) => e.program_id));
    const toInsert = valid.filter((p) => !already.has(p.id));
    if (toInsert.length === 0) {
      throw new Error("Já existe inscrição da tua organização para todos os programas selecionados.");
    }

    const { error: iErr } = await supabaseAdmin
      .from("inscricoes_entidade_programa")
      .insert(
        toInsert.map((p) => ({
          entity_id: user.entity_id!,
          program_id: p.id,
          requested_by: userId,
          status: "pendente",
        })),
      );
    if (iErr) throw new Error(iErr.message);

    // Notification in-app
    await supabaseAdmin.from("notificacoes").insert({
      user_id: userId,
      title: "Inscrição em programa submetida",
      message: `A inscrição da ${entity?.name ?? "tua organização"} em ${toInsert.length} programa(s) está pendente de validação.`,
      link: "/entidade/dashboard",
    });

    // Send confirmation email (best-effort)
    const recipientEmail = user.email ?? entity?.contact_email ?? null;
    if (recipientEmail) {
      try {
        const origin = process.env.SITE_URL ?? "https://app.ipav.pt";
        const authHeader = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
        // Use service-role token only when there's no user token; the send endpoint validates auth.
        // Prefer relaying the user's session via a direct insert in queue:
        await supabaseAdmin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            template_name: "program-enrollment-pending",
            recipient_email: recipientEmail,
            idempotency_key: `enroll-${user.entity_id}-${toInsert.map((p) => p.id).sort().join("-")}`,
            template_data: {
              recipientName: user.full_name ?? null,
              entityName: entity?.name ?? "",
              programTitles: toInsert.map((p) => p.title ?? "Programa"),
            },
          },
        });
        void origin;
        void authHeader;
      } catch (err) {
        console.error("[enrollEntity] email enqueue failed", err);
      }
    }

    return { ok: true, count: toInsert.length };
  });

export const listMyEntityProgramEnrollments = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ entityId: z.string().uuid().optional() }).optional().transform((v) => v ?? {}).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: user } = await supabaseAdmin
      .from("utilizadores")
      .select("entity_id, role")
      .eq("id", userId)
      .maybeSingle();
    const isAdmin = user?.role === "Admin";
    const entityId = (isAdmin && data.entityId) ? data.entityId : user?.entity_id ?? null;
    if (!entityId) return [];

    const { data: rows, error } = await supabaseAdmin
      .from("inscricoes_entidade_programa")
      .select("id, status, created_at, program_id, programas(title, cluster_id, clusters(name))")
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      program_title: r.programas?.title ?? "—",
      cluster_name: r.programas?.clusters?.name ?? null,
    }));
  });
