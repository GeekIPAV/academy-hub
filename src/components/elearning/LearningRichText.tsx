import type { ReactNode } from "react";
import parse, { domToReact, Element, type DOMNode, type HTMLReactParserOptions } from "html-react-parser";
import { ArrowUpRight, ExternalLink, FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { isSuggestedDocument, videoEmbedUrl } from "@/lib/elearning-media";

function textContent(node: DOMNode): string {
  if (node.type === "text") return node.data;
  if (node instanceof Element) return (node.children as DOMNode[]).map(textContent).join("");
  return "";
}

/** Prominent, tappable call-to-action used for every link that becomes a button. */
function LinkButton({
  href,
  label,
  icon,
  tone,
  children,
}: {
  href: string;
  label: string;
  icon: "globe" | "file";
  tone: "link" | "document";
  children?: React.ReactNode;
}) {
  const chip = tone === "document" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground";
  const text = tone === "document" ? "text-primary" : "text-secondary";
  const Icon = icon === "file" ? FileText : Globe;
  return (
    <Button
      asChild
      variant="outline"
      className={
        "my-3 h-auto min-h-14 w-full max-w-full items-center gap-3 whitespace-normal rounded-xl border-transparent bg-card px-3.5 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md " +
        (tone === "document" ? "border-primary/25 bg-primary/[0.06] hover:border-primary/45" : "border-secondary/15 bg-secondary/[0.05] hover:border-secondary/35")
      }
    >
      <a href={href} target="_blank" rel="noopener noreferrer" className="no-underline flex w-full items-center gap-3">
        <span aria-hidden className={"grid size-9 shrink-0 place-items-center rounded-lg " + chip}>
          <Icon />
        </span>
        <span className="min-w-0 flex-1 break-words">
          {children}
          <span className={"block font-medium " + text}>{label}</span>
        </span>
        <ArrowUpRight aria-hidden className="size-4 shrink-0 text-primary" />
      </a>
    </Button>
  );
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
      if (isSuggestedDocument(href, label)) return <LinkButton href={href} icon="file" tone="document" label="Abrir documento">
        <span className="mb-0.5 block min-w-0 break-words text-sm font-medium text-foreground">{domToReact(node.children as DOMNode[])}</span>
      </LinkButton>;
      return <LinkButton href={href} icon="globe" tone="link" label={label || "Abrir ligação"} />;
    },
  };
  return <div className={className}>{parse(sanitizeRichHtml(html), options)}</div>;
}
