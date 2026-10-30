import sanitizeHtml from "sanitize-html";

// The upload editor already normalizes pasted Google Docs / Word markup in the
// browser; this is the server-side allowlist that decides what actually gets
// stored and rendered (it's injected into the page and into emails).
const BLOCKS = ["p", "blockquote", "ul", "ol", "li", "h2", "h3", "h4"];

export function sanitizeEssayHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...BLOCKS, "br", "hr", "strong", "em", "u", "s", "a"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      ...Object.fromEntries(BLOCKS.map((t) => [t, ["dir", "style"]])),
    },
    allowedStyles: {
      "*": { "text-align": [/^(left|right|center|justify)$/] },
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      b: "strong",
      i: "em",
      h1: "h2",
      h5: "h4",
      h6: "h4",
      div: "p",
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener" }),
    },
    // Google Docs separates paragraphs with empty <p><br></p> — CSS already
    // spaces paragraphs, so those would double the gaps.
    exclusiveFilter: (frame) =>
      frame.tag === "p" && !frame.text.replace(/ /g, " ").trim(),
  }).trim();
}

/** True if the sanitized HTML has any readable text. */
export function hasText(html: string): boolean {
  return htmlToText(html).trim().length > 0;
}

export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(p|blockquote|li|h2|h3|h4)>/gi, "\n\n")
    .replace(/<hr[^>]*>/gi, "\n———\n\n");
  return sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Email clients ignore <style> blocks unreliably, so the essay's tags get the
// site's typography as inline styles.
const SERIF = "Georgia, 'Times New Roman', serif";
const EMAIL_STYLES: Record<string, string> = {
  p: `margin:0 0 18px;font-family:${SERIF};font-size:17px;line-height:1.75;color:#23304a;`,
  blockquote: `margin:0 0 18px;padding:2px 0 2px 16px;border-left:3px solid #cf9f60;font-family:${SERIF};font-size:17px;line-height:1.75;color:#4d6b8a;font-style:italic;`,
  ul: `margin:0 0 18px;padding-left:24px;font-family:${SERIF};font-size:17px;line-height:1.75;color:#23304a;`,
  ol: `margin:0 0 18px;padding-left:24px;font-family:${SERIF};font-size:17px;line-height:1.75;color:#23304a;`,
  li: "margin:0 0 6px;",
  h2: `margin:28px 0 12px;font-family:${SERIF};font-size:22px;font-weight:bold;color:#1c2a44;`,
  h3: `margin:24px 0 10px;font-family:${SERIF};font-size:19px;font-weight:bold;color:#1c2a44;`,
  h4: `margin:20px 0 8px;font-family:${SERIF};font-size:17px;font-weight:bold;color:#1c2a44;`,
  a: "color:#a3763f;text-decoration:underline;",
  hr: "border:none;border-top:1px solid #e3dccb;margin:24px 0;",
};

/** Takes already-sanitized essay HTML and inlines the site's styles. */
export function emailifyHtml(html: string): string {
  const transformTags = Object.fromEntries(
    Object.entries(EMAIL_STYLES).map(([tag, style]) => [
      tag,
      (tagName: string, attribs: sanitizeHtml.Attributes) => {
        const extra = attribs.style ? attribs.style.replace(/;?$/, ";") : "";
        const rtl = attribs.dir === "rtl" ? "text-align:right;" : "";
        return { tagName, attribs: { ...attribs, style: style + rtl + extra } };
      },
    ])
  );
  return sanitizeHtml(html, {
    // Input has already been through sanitizeEssayHtml; this pass only adds styles.
    allowedTags: false,
    allowedAttributes: false,
    allowVulnerableTags: true,
    transformTags,
  });
}
