import { describe, expect, it } from "vitest";
import { isSuggestedDocument, videoEmbedUrl } from "./elearning-media";

describe("embedded learning videos", () => {
  it("embeds the course's YouTube link", () => {
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=0wZtfqZ271w")).toBe("https://www.youtube-nocookie.com/embed/0wZtfqZ271w");
  });
  it("supports short YouTube URLs", () => {
    expect(videoEmbedUrl("https://youtu.be/7UojwMiRpNM")).toBe("https://www.youtube-nocookie.com/embed/7UojwMiRpNM");
  });
  it("preserves private Vimeo video hashes", () => {
    expect(videoEmbedUrl("https://vimeo.com/123456789/abc123")).toBe("https://player.vimeo.com/video/123456789?h=abc123");
  });
  it("rejects lookalike hosts and executable URLs", () => {
    expect(videoEmbedUrl("https://youtube.com.evil.test/watch?v=0wZtfqZ271w")).toBeNull();
    expect(videoEmbedUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("suggested documents", () => {
  it("recognizes PDFs with signed query strings", () => {
    expect(isSuggestedDocument("https://example.org/guia.pdf?token=test", "Guia Ubuntu")).toBe(true);
  });
  it("keeps ordinary websites as links", () => {
    expect(isSuggestedDocument("https://www.change.org/p/ubuntu", "Subscrever a Declaração Ubuntu")).toBe(false);
  });
});