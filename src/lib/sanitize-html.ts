import { FilterXSS } from "xss";

// Allowlist matches what TipTap StarterKit / our editors can emit.
const filter = new FilterXSS({
  whiteList: {
    p: ["class"],
    br: [],
    strong: [],
    em: [],
    u: [],
    s: [],
    code: ["class"],
    pre: ["class"],
    blockquote: [],
    hr: [],
    h1: ["class"], h2: ["class"], h3: ["class"],
    h4: ["class"], h5: ["class"], h6: ["class"],
    ul: ["class"], ol: ["class"], li: ["class"],
    a: ["href", "target", "rel", "title"],
    img: ["src", "alt", "title", "width", "height"],
    span: ["class"],
    div: ["class"],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
  allowCommentTag: false,
});

/**
 * Sanitiza HTML rico (TipTap / editores) antes de o injetar via
 * dangerouslySetInnerHTML. Bloqueia <script>, handlers inline, javascript: URLs, etc.
 * Compatível com runtime Cloudflare Workers (puro JS, sem jsdom).
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return filter.process(html);
}
