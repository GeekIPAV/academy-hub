import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertRouteAccess } from "@/lib/admin-access.server";

export const DEFAULT_BASE_URL = "https://app.ipav.pt";

/** Admin, Equipa IPAV ou papel autorizado na matriz para /admin/elearning. */
export async function assertElearningAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId)
    .in("role_name", ["Admin", "Equipa IPAV"])
    .limit(1);
  if (data && data.length) return;
  await assertRouteAccess(userId, "/admin/elearning");
}

export async function logAtividade(
  userId: string,
  inscricaoId: string | null,
  passoId: string | null,
  evento: string,
  payload?: Record<string, unknown>,
) {
  await supabaseAdmin.from("cursos_atividade").insert({
    user_id: userId,
    inscricao_id: inscricaoId,
    passo_id: passoId,
    evento,
    payload: (payload ?? null) as never,
  });
}

/** Atribui badge. `reset` = true recomeça a validade (conclusão / renovação). */
export async function atribuirBadge(userId: string, badgeId: string, reset: boolean) {
  if (reset) {
    const { error } = await supabaseAdmin.from("user_badges").upsert(
      { user_id: userId, badge_id: badgeId, granted_at: new Date().toISOString(), expires_at: null },
      { onConflict: "user_id,badge_id" },
    );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin
      .from("user_badges")
      .upsert({ user_id: userId, badge_id: badgeId }, { onConflict: "user_id,badge_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
}

export function addDays(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Data de abertura do módulo (drip) ou null se já/sempre aberto. */
export function aberturaModulo(
  modalidade: string,
  aberturaDias: number | null,
  turmaInicio: string | null,
): string | null {
  if (modalidade !== "turma" || aberturaDias == null || !turmaInicio) return null;
  const d = addDays(turmaInicio, aberturaDias);
  return d > new Date().toISOString().slice(0, 10) ? d : null;
}

type Passo = { id: string; obrigatorio: boolean };

/** Verifica e processa a conclusão do curso. Devolve true se concluiu agora. */
export async function avaliarConclusao(inscricaoId: string, baseUrl: string): Promise<boolean> {
  const { data: insc } = await supabaseAdmin
    .from("cursos_inscricoes")
    .select("id, user_id, curso_id, turma_id, estado, inscrito_em, iniciado_em")
    .eq("id", inscricaoId)
    .maybeSingle();
  if (!insc || insc.estado === "concluido" || insc.estado === "cancelado") return false;

  const { data: mods } = await supabaseAdmin
    .from("cursos_modulos")
    .select("id, cursos_passos(id, obrigatorio)")
    .eq("curso_id", insc.curso_id);
  const passos = (mods ?? []).flatMap((m) => (m.cursos_passos ?? []) as Passo[]);
  const obrig = passos.filter((p) => p.obrigatorio).map((p) => p.id);
  if (obrig.length === 0) return false;

  const { data: prog } = await supabaseAdmin
    .from("cursos_progresso")
    .select("passo_id, estado")
    .eq("inscricao_id", inscricaoId)
    .eq("estado", "concluido");
  const done = new Set((prog ?? []).map((p) => p.passo_id));
  if (!obrig.every((id) => done.has(id))) return false;

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("cursos_inscricoes")
    .update({ estado: "concluido", concluido_em: now })
    .eq("id", inscricaoId);
  await logAtividade(insc.user_id, inscricaoId, null, "conclusao_curso");

  const { data: curso } = await supabaseAdmin
    .from("cursos")
    .select("badge_final_id, badge_renovado_id, tem_certificado")
    .eq("id", insc.curso_id)
    .single();
  if (curso?.badge_final_id) await atribuirBadge(insc.user_id, curso.badge_final_id, true);
  if (curso?.badge_renovado_id && curso.badge_renovado_id !== curso.badge_final_id)
    await atribuirBadge(insc.user_id, curso.badge_renovado_id, true);
  if (curso?.tem_certificado) {
    try {
      await emitirCertificado(inscricaoId, baseUrl, true);
    } catch (e) {
      console.error("[elearning] certificado falhou", e);
    }
  }
  return true;
}

function gerarCodigo() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const s = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `ALU-${s.slice(0, 5)}-${s.slice(5)}`;
}

function fmt(d: string | null) {
  if (!d) return "";
  return new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function emitirCertificado(inscricaoId: string, baseUrl: string, sendEmail: boolean) {
  const { data: insc } = await supabaseAdmin
    .from("cursos_inscricoes")
    .select("id, user_id, curso_id, turma_id, inscrito_em, iniciado_em, concluido_em")
    .eq("id", inscricaoId)
    .single();
  if (!insc) throw new Error("Inscrição não encontrada.");
  const [{ data: curso }, { data: user }, turmaRes, { data: existing }] = await Promise.all([
    supabaseAdmin.from("cursos").select("title, horas, modalidade, acreditacao_ref").eq("id", insc.curso_id).single(),
    supabaseAdmin.from("utilizadores").select("full_name, email").eq("id", insc.user_id).maybeSingle(),
    insc.turma_id
      ? supabaseAdmin.from("cursos_turmas").select("data_inicio, data_fim").eq("id", insc.turma_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin.from("certificados_elearning").select("id, codigo").eq("inscricao_id", inscricaoId).maybeSingle(),
  ]);
  if (!curso) throw new Error("Curso não encontrado.");
  const turma = turmaRes.data as { data_inicio: string | null; data_fim: string | null } | null;
  const nome = user?.full_name?.trim() || user?.email || "Participante";
  const modalidade = curso.modalidade === "turma" ? "B-learning" : "Online";
  const dataInicio = turma?.data_inicio ?? (insc.iniciado_em ?? insc.inscrito_em).slice(0, 10);
  const dataFim = turma?.data_fim ?? (insc.concluido_em ?? new Date().toISOString()).slice(0, 10);
  const codigo = existing?.codigo ?? gerarCodigo();
  const verifyUrl = `${baseUrl}/certificados/verificar/${codigo}`;

  const pdf = await buildPdf({
    nome,
    curso: curso.title,
    horas: curso.horas != null ? Number(curso.horas) : null,
    modalidade,
    dataInicio,
    dataFim,
    codigo,
    verifyUrl,
    acreditacao: curso.acreditacao_ref,
  });
  const path = `elearning/${codigo}.pdf`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("certificados")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(upErr.message);

  const row = {
    inscricao_id: inscricaoId,
    user_id: insc.user_id,
    curso_id: insc.curso_id,
    codigo,
    nome,
    curso_titulo: curso.title,
    horas: curso.horas,
    modalidade,
    data_inicio: dataInicio,
    data_fim: dataFim,
    storage_path: path,
    emitido_em: new Date().toISOString(),
    revogado: false,
  };
  const { error } = await supabaseAdmin.from("certificados_elearning").upsert(row, { onConflict: "inscricao_id" });
  if (error) throw new Error(error.message);

  const { data: pub } = supabaseAdmin.storage.from("certificados").getPublicUrl(path);
  if (sendEmail && user?.email) {
    try {
      await supabaseAdmin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          template_name: "elearning-certificado",
          recipient_email: user.email,
          idempotency_key: `elearning-cert-${inscricaoId}-${Date.now()}`,
          template_data: { recipientName: nome, cursoTitulo: curso.title, certUrl: pub.publicUrl, verifyUrl },
        },
      });
    } catch (e) {
      console.error("[elearning] email falhou", e);
    }
  }
  return { codigo, url: pub.publicUrl };
}

async function buildPdf(i: {
  nome: string;
  curso: string;
  horas: number | null;
  modalidade: string;
  dataInicio: string | null;
  dataFim: string | null;
  codigo: string;
  verifyUrl: string;
  acreditacao: string | null;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const azul = rgb(0x19 / 255, 0x3b / 255, 0x69 / 255);
  const laranja = rgb(1, 0x82 / 255, 0x26 / 255);
  const texto = rgb(0.15, 0.15, 0.18);

  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: azul });
  page.drawRectangle({ x: 0, y: height - 96, width, height: 6, color: laranja });
  page.drawText("ACADEMIA DE LÍDERES UBUNTU · ESCOLA UBUNTU ONLINE", {
    x: 40, y: height - 55, size: 14, font: bold, color: rgb(1, 1, 1),
  });

  const center = (t: string, y: number, size: number, font = reg, color = texto) => {
    let s = size;
    while (font.widthOfTextAtSize(t, s) > width - 120 && s > 8) s -= 1;
    page.drawText(t, { x: (width - font.widthOfTextAtSize(t, s)) / 2, y, size: s, font, color });
  };
  center("CERTIFICADO DE FORMAÇÃO", height - 160, 26, bold, azul);
  center("Certifica-se que", height - 205, 13);
  center(i.nome.toUpperCase(), height - 245, 24, bold);
  center("concluiu com aproveitamento o curso", height - 285, 13);
  center(i.curso, height - 322, 18, bold, azul);
  const periodo =
    i.dataInicio && i.dataFim && i.dataInicio !== i.dataFim
      ? `de ${fmt(i.dataInicio)} a ${fmt(i.dataFim)}`
      : `em ${fmt(i.dataFim ?? i.dataInicio)}`;
  center(
    `Modalidade ${i.modalidade}${i.horas ? ` · ${i.horas} horas de formação` : ""} · ${periodo}`,
    height - 355, 12,
  );
  if (i.acreditacao) center(`Acreditação: ${i.acreditacao}`, height - 377, 11);

  // QR
  const qr = QRCode.create(i.verifyUrl, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const qrSize = 96;
  const cell = qrSize / n;
  const qx = width - qrSize - 40;
  const qy = 40;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.modules.get(r, c))
        page.drawRectangle({ x: qx + c * cell, y: qy + (n - 1 - r) * cell, width: cell, height: cell, color: rgb(0, 0, 0) });

  page.drawText(`Código de verificação: ${i.codigo}`, { x: 40, y: 70, size: 10, font: bold, color: texto });
  page.drawText(`Verifique em ${i.verifyUrl}`, { x: 40, y: 54, size: 9, font: reg, color: texto });
  page.drawText(`Emitido em ${fmt(new Date().toISOString())}`, { x: 40, y: 38, size: 9, font: reg, color: texto });
  return pdf.save();
}
