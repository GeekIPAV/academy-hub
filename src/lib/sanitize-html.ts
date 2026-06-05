import DOMPurify from "isomorphic-dompurify";

// Allowlist matches what TipTap StarterKit / our editors can emit.
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "code", "pre",
  "blockquote", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "a", "img",
  "span", "div",
];

const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "title", "class"];

/**
 * Sanitiza HTML rico (TipTap / editores) antes de o injetar via
 * dangerouslySetInnerHTML. Bloqueia <script>, handlers inline, etc.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:image\/[a-z]+;base64,):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}
