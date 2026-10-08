import parse, { domToReact, Element, type DOMNode, type HTMLReactParserOptions } from "html-react-parser";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { isSuggestedDocument, videoEmbedUrl } from "@/lib/elearning-media";

function textContent(node: DOMNode): string {
  if (node.type === "text") return node.data;
  if (node instanceof Element) return (node.children as DOMNode[]).map(textContent).join("");
  return "";
}

/** Enhance sanitized links in place, without changing the saved lesson. */
export function LearningRichText({ html, className }: { html: string; className?: string }) {
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof Element) || node.name !== "a" || !node.attribs.href) return;
      const href = node.attribs.href;
      const label = textContent(node).trim();
      const embed = videoEmbedUrl(href);
      if (embed) return <span className="my-5 block min-w-0">
        <span className="block aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          <iframe src={embed} title={label || "Vídeo da formação"} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full w-full border-0" />
        </span>
        <Button asChild variant="outline" className="mt-2 h-auto min-h-10 max-w-full whitespace-normal text-left"><a href={href} target="_blank" rel="noopener noreferrer" className="no-underline"><ExternalLink /><span className="min-w-0 break-words">{label || "Abrir vídeo"}</span></a></Button>
      </span>;
      if (isSuggestedDocument(href, label)) return <span className="my-3 block min-w-0">
        <span className="mb-2 block font-medium">{domToReact(node.children as DOMNode[])}</span>
        <Button asChild variant="outline" className="h-auto min-h-10 max-w-full whitespace-normal"><a href={href} target="_blank" rel="noopener noreferrer" className="no-underline" aria-label={`Abrir documento: ${label}`}><ExternalLink />Abrir documento</a></Button>
      </span>;
      return <Button asChild variant="outline" className="my-1 h-auto min-h-10 max-w-full whitespace-normal text-left"><a href={href} target="_blank" rel="noopener noreferrer" className="no-underline"><ExternalLink /><span className="min-w-0 break-words">{label || "Abrir ligação"}</span></a></Button>;
    },
  };
  return <div className={className}>{parse(sanitizeRichHtml(html), options)}</div>;
}