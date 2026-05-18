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

const TEMPLATE_URL =
  "https://ncfqaqfqvgzaerhnocws.supabase.co/storage/v1/object/public/certificados/_template/template.pdf";

let cachedTemplate: Uint8Array | null = null;
async function loadTemplate(): Promise<Uint8Array> {
  if (cachedTemplate) return cachedTemplate;
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error(`Falha ao carregar template (${res.status})`);
  cachedTemplate = new Uint8Array(await res.arrayBuffer());
  return cachedTemplate;
}

function formatPt(d: string | null): string {
  if (!d) return "";
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

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  if (start && end && start !== end) {
    return `${formatPt(start)} a ${formatPt(end)}`;
  }
  return formatPt(start || end);
}

/**
 * Generates a certificate PDF by overlaying participant data on top of the
 * official Escolas Ubuntu template (A5 landscape, 595x420 pt).
 */
export async function generateCertificatePdf(
  input: CertificateInput,
): Promise<Uint8Array> {
  const templateBytes = await loadTemplate();
  const pdf = await PDFDocument.load(templateBytes);
  const page = pdf.getPage(0);
  const { width } = page.getSize();

  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helv = await pdf.embedFont(StandardFonts.Helvetica);

  const text = rgb(0.12, 0.12, 0.14);

  // --- Participant name (centered, above the "completou a Semana Ubuntu" line)
  const name = input.participantName.toUpperCase();
  let nameSize = 18;
  const maxNameWidth = width - 180;
  let nameWidth = helvBold.widthOfTextAtSize(name, nameSize);
  while (nameWidth > maxNameWidth && nameSize > 10) {
    nameSize -= 1;
    nameWidth = helvBold.widthOfTextAtSize(name, nameSize);
  }
  page.drawText(name, {
    x: (width - nameWidth) / 2,
    y: 298,
    size: nameSize,
    font: helvBold,
    color: text,
  });

  // --- Data field
  const dateText = formatDateRange(input.startDate, input.endDate);
  if (dateText) {
    page.drawText(dateText, {
      x: 245,
      y: 180,
      size: 11,
      font: helv,
      color: text,
    });
  }

  // --- Local field
  const local = input.entityName || "";
  if (local) {
    page.drawText(local, {
      x: 245,
      y: 158,
      size: 11,
      font: helv,
      color: text,
    });
  }

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
