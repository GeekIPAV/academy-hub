import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { EMAIL_TEMPLATE_CATALOG, getCatalogEntry } from "@/lib/email-templates/catalog";
import { assertRouteAccess } from "@/lib/admin-access.server";

async function assertAdmin(userId: string) {
  await assertRouteAccess(userId, "/admin/emails");
}


export interface EmailTemplateListItem {
  key: string;
  kind: "auth" | "app";
  displayName: string;
  description: string;
  customized: boolean;
}

export const listEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmailTemplateListItem[]> => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("email_templates_custom")
      .select("template_key");
    if (error) throw new Error(error.message);
    const customSet = new Set((data ?? []).map((r) => r.template_key));
    return EMAIL_TEMPLATE_CATALOG.map((c) => ({
      key: c.key,
      kind: c.kind,
      displayName: c.displayName,
      description: c.description,
      customized: customSet.has(c.key),
    }));
  });

const keySchema = z.object({ key: z.string().min(1).max(200) });

export interface EmailTemplateDetail {
  key: string;
  kind: "auth" | "app";
  displayName: string;
  description: string;
  subject: string;
  bodyHtml: string;
  defaultSubject: string;
  defaultBodyHtml: string;
  customized: boolean;
  variables: { key: string; label: string; example: string }[];
}

export const getEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => keySchema.parse(input))
  .handler(async ({ data, context }): Promise<EmailTemplateDetail> => {
    await assertAdmin(context.userId);
    const entry = getCatalogEntry(data.key);
    if (!entry) throw new Error("Template não encontrado.");
    const { data: custom, error } = await supabaseAdmin
      .from("email_templates_custom")
      .select("subject, body_html")
      .eq("template_key", data.key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      key: entry.key,
      kind: entry.kind,
      displayName: entry.displayName,
      description: entry.description,
      subject: custom?.subject ?? entry.defaultSubject,
      bodyHtml: custom?.body_html ?? entry.defaultBodyHtml,
      defaultSubject: entry.defaultSubject,
      defaultBodyHtml: entry.defaultBodyHtml,
      customized: !!custom,
      variables: entry.variables,
    };
  });

const saveSchema = z.object({
  key: z.string().min(1).max(200),
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().trim().min(1).max(50000),
});

export const saveEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const entry = getCatalogEntry(data.key);
    if (!entry) throw new Error("Template não encontrado.");
    const { error } = await supabaseAdmin.from("email_templates_custom").upsert(
      {
        template_key: data.key,
        kind: entry.kind,
        subject: data.subject,
        body_html: data.bodyHtml,
        updated_by: context.userId,
      },
      { onConflict: "template_key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => keySchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("email_templates_custom")
      .delete()
      .eq("template_key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
