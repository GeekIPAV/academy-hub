import { renderRichText } from "@/components/admin/PaginaAvaliacaoEditor";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import type { PageBlock } from "@/lib/avaliacao-types";

export function AvaliacaoBlocks({ blocks }: { blocks: PageBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block) =>
        block.type === "table" ? (
          <div key={block.id} className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/60">
                <tr>{(block.headers ?? []).map((header, index) => <th key={index} className="px-4 py-3 font-semibold text-secondary">{header}</th>)}</tr>
              </thead>
              <tbody>
                {(block.rows ?? []).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t align-top">
                    {(block.headers ?? []).map((_, colIndex) => <td key={colIndex} className="px-4 py-3 leading-6 text-muted-foreground">{row[colIndex] ?? ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : block.type === "image" && block.url ? (
          <img key={block.id} src={block.url} alt={block.alt ?? ""} className="max-h-[520px] w-full rounded-lg object-contain" />
        ) : (
          <div key={block.id} className="rich-text rounded-sm" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(renderRichText(block.content)) }} />
        ),
      )}
    </div>
  );
}
