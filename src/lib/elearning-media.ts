/** Only known video providers may become embedded frames. */
export function videoEmbedUrl(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (["youtube.com", "m.youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) {
      const id = host === "youtu.be" ? url.pathname.slice(1) : url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
      if (!id || !/^[\w-]{11}$/.test(id)) return null;
      return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const match = url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/);
      if (!match) return null;
      const hash = url.searchParams.get("h") ?? match[2];
      return `https://player.vimeo.com/video/${match[1]}${hash ? `?h=${encodeURIComponent(hash)}` : ""}`;
    }
  } catch { /* Keep malformed links as text links. */ }
  return null;
}

export function isSuggestedDocument(href: string, label: string): boolean {
  try {
    const url = new URL(href, "https://local.invalid");
    if (!["https:", "http:"].includes(url.protocol)) return false;
    return /\.(?:pdf|docx?|pptx?|xlsx?|odt|epub)(?:$|[?#])/i.test(url.href)
      || ["docs.google.com", "drive.google.com"].includes(url.hostname)
      || /\b(documento|pdf|artigo|manual|guia|leitura|descarregar)\b/i.test(label);
  } catch { return false; }
}