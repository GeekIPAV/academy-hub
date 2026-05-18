import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CertificateInput = {
  participantName: string;
  actionTitle: string;
  actionType: string | null;
  entityName: string | null;
  startDate: string | null;
  endDate: string | null;
};

function formatPt(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

/**
 * Generates a simple, clean certificate PDF (A4 landscape) and uploads it
 * to the public `certificados` bucket. Returns the public URL.
 *
 * NOTE: This is a placeholder template — the visual design will be replaced
 * once the final layout is provided.
 */
export async function generateCertificatePdf(
  input: CertificateInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  // A4 landscape (842 x 595 pt)
  const page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helvOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const primary = rgb(0.16, 0.32, 0.55);
  const gold = rgb(0.79, 0.66, 0.3);
  const text = rgb(0.12, 0.12, 0.14);
  const muted = rgb(0.45, 0.45, 0.5);

  // Outer border
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: primary,
    borderWidth: 2,
  });
  // Inner thin gold border
  page.drawRectangle({
    x: 42,
    y: 42,
    width: width - 84,
    height: height - 84,
    borderColor: gold,
    borderWidth: 0.8,
  });

  // Title
  const title = "CERTIFICADO";
  const titleSize = 40;
  const titleWidth = helvBold.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 130,
    size: titleSize,
    font: helvBold,
    color: primary,
  });

  // Decorative line
  page.drawLine({
    start: { x: width / 2 - 70, y: height - 145 },
    end: { x: width / 2 + 70, y: height - 145 },
    thickness: 1.2,
    color: gold,
  });

  // Subtitle
  const subtitle = "DE PARTICIPAÇÃO";
  const subtitleSize = 14;
  const subtitleWidth = helv.widthOfTextAtSize(subtitle, subtitleSize);
  page.drawText(subtitle, {
    x: (width - subtitleWidth) / 2,
    y: height - 175,
    size: subtitleSize,
    font: helv,
    color: muted,
  });

  // "Certifica-se que"
  const intro = "Certifica-se que";
  const introSize = 14;
  const introWidth = helv.widthOfTextAtSize(intro, introSize);
  page.drawText(intro, {
    x: (width - introWidth) / 2,
    y: height - 230,
    size: introSize,
    font: helvOblique,
    color: muted,
  });

  // Participant name
  const name = input.participantName.toUpperCase();
  const nameSize = 32;
  const nameWidth = helvBold.widthOfTextAtSize(name, nameSize);
  page.drawText(name, {
    x: Math.max(60, (width - nameWidth) / 2),
    y: height - 275,
    size: nameSize,
    font: helvBold,
    color: text,
  });

  // Body
  const actionLabel = input.actionType
    ? `${input.actionType} — ${input.actionTitle}`
    : input.actionTitle;
  const entityPart = input.entityName ? ` na ${input.entityName}` : "";
  const datesPart =
    input.startDate && input.endDate
      ? input.startDate === input.endDate
        ? ` no dia ${formatPt(input.startDate)}`
        : ` entre ${formatPt(input.startDate)} e ${formatPt(input.endDate)}`
      : "";

  const body = `participou na ação "${actionLabel}"${entityPart}${datesPart}.`;
  // Simple line wrap
  const bodySize = 14;
  const maxWidth = width - 160;
  const words = body.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const tentative = current ? current + " " + w : w;
    if (helv.widthOfTextAtSize(tentative, bodySize) > maxWidth) {
      lines.push(current);
      current = w;
    } else {
      current = tentative;
    }
  }
  if (current) lines.push(current);
  lines.forEach((line, i) => {
    const w = helv.widthOfTextAtSize(line, bodySize);
    page.drawText(line, {
      x: (width - w) / 2,
      y: height - 325 - i * 20,
      size: bodySize,
      font: helv,
      color: text,
    });
  });

  // Footer left: date emitted
  const today = new Date().toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  page.drawText(`Emitido em ${today}`, {
    x: 80,
    y: 90,
    size: 10,
    font: helv,
    color: muted,
  });

  // Footer right: signature line
  page.drawLine({
    start: { x: width - 280, y: 110 },
    end: { x: width - 80, y: 110 },
    thickness: 0.8,
    color: muted,
  });
  page.drawText("Assinatura", {
    x: width - 200,
    y: 92,
    size: 10,
    font: helvOblique,
    color: muted,
  });

  return await pdf.save();
}

export async function uploadCertificate(
  actionId: string,
  participanteId: string,
  bytes: Uint8Array,
): Promise<string> {
  const path = `${actionId}/${participanteId}.pdf`;
  const { error } = await supabaseAdmin.storage
    .from("certificados")
    .upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage
    .from("certificados")
    .getPublicUrl(path);
  return data.publicUrl;
}
