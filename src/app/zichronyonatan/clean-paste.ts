// Turns clipboard HTML from Google Docs, Word, Gmail, web pages, etc. into a
// small, consistent subset: paragraphs, headings, quotes, lists, links, line
// breaks, and bold/italic/underline. The server sanitizes again on upload;
// this pass is about *keeping* formatting that those apps express as inline
// styles (e.g. Google Docs' <span style="font-weight:700">) rather than tags.

type Fmt = { bold: boolean; italic: boolean; underline: boolean };

const BLOCK_MAP: Record<string, string> = {
  P: "p",
  DIV: "p",
  H1: "h2",
  H2: "h2",
  H3: "h3",
  H4: "h4",
  H5: "h4",
  H6: "h4",
  BLOCKQUOTE: "blockquote",
  UL: "ul",
  OL: "ol",
  LI: "li",
  TD: "p",
  TH: "p",
  PRE: "p",
};
const SKIP = new Set(["STYLE", "SCRIPT", "META", "LINK", "TITLE", "HEAD", "IMG", "SVG", "XML", "O:P", "TEMPLATE"]);
const OUT_BLOCKS = new Set(["p", "h2", "h3", "h4", "blockquote", "ul", "ol", "li"]);

function nextFmt(el: HTMLElement, fmt: Fmt): Fmt {
  const tag = el.tagName;
  const s = el.style;
  const next = { ...fmt };

  if (tag === "B" || tag === "STRONG") next.bold = true;
  if (tag === "I" || tag === "EM" || tag === "CITE") next.italic = true;
  if (tag === "U" || tag === "INS") next.underline = true;

  // Inline styles override tags — Google Docs wraps the whole paste in
  // <b style="font-weight:normal">, which must NOT make everything bold.
  const w = s.fontWeight;
  if (w) next.bold = w === "bold" || w === "bolder" || Number(w) >= 600;
  if (s.fontStyle) next.italic = s.fontStyle === "italic" || s.fontStyle === "oblique";
  const deco = s.textDecorationLine || s.textDecoration;
  if (deco) next.underline = deco.includes("underline");

  return next;
}

function wrapText(doc: Document, text: string, fmt: Fmt): Node {
  let node: Node = doc.createTextNode(text);
  for (const [on, tag] of [
    [fmt.underline, "u"],
    [fmt.italic, "em"],
    [fmt.bold, "strong"],
  ] as const) {
    if (!on) continue;
    const w = doc.createElement(tag);
    w.appendChild(node);
    node = w;
  }
  return node;
}

function copyBlockAttrs(from: HTMLElement, to: HTMLElement) {
  const dir = from.getAttribute("dir") || (from.style.direction === "rtl" ? "rtl" : "");
  if (dir === "rtl" || dir === "ltr") to.setAttribute("dir", dir);
  const align = from.style.textAlign || from.getAttribute("align") || "";
  if (["center", "right", "justify"].includes(align)) to.style.textAlign = align;
}

function walk(node: Node, container: HTMLElement, fmt: Fmt, out: Document) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent || "").replace(/[\r\n]+/g, " ");
    if (!text) return;
    // Whitespace between blocks (Word/GDocs HTML is full of it) is noise;
    // whitespace between inline runs is a real space.
    if (!text.trim()) {
      const last = container.lastChild as Element | null;
      if (!last || (last.nodeType === Node.ELEMENT_NODE && OUT_BLOCKS.has(last.tagName.toLowerCase()))) return;
    }
    container.appendChild(wrapText(out, text, fmt));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();
  if (SKIP.has(tag)) return;
  // Word's hidden list bullets/numbering spans stay (they're the only
  // numbering we get); its comment-only conditional junk doesn't reach here.
  if (el.style.display === "none") return;

  if (tag === "BR") {
    container.appendChild(out.createElement("br"));
    return;
  }
  if (tag === "HR") {
    container.appendChild(out.createElement("hr"));
    return;
  }

  const f = nextFmt(el, fmt);

  if (tag === "A") {
    const href = el.getAttribute("href") || "";
    if (/^(https?:|mailto:)/i.test(href)) {
      const a = out.createElement("a");
      a.setAttribute("href", href);
      container.appendChild(a);
      el.childNodes.forEach((c) => walk(c, a, f, out));
      return;
    }
  }

  const mapped = BLOCK_MAP[tag];
  if (mapped) {
    const parentTag = container.tagName.toLowerCase();
    // Paragraphs nested in list items, headings, or other paragraphs
    // (GDocs: <li><p>…</p></li>) flatten into their parent block.
    const flatten =
      (mapped === "p" && ["li", "p", "h2", "h3", "h4"].includes(parentTag)) ||
      (mapped === "p" && el.querySelector("p,div,h1,h2,h3,h4,h5,h6,ul,ol,blockquote,table"));
    if (flatten) {
      // Keep consecutive flattened paragraphs on separate lines.
      if ((parentTag === "li" || parentTag === "p") && container.lastChild) {
        container.appendChild(out.createElement("br"));
      }
      el.childNodes.forEach((c) => walk(c, container, f, out));
      return;
    }
    const block = out.createElement(mapped);
    copyBlockAttrs(el, block);
    // Lists and quotes can only live at the top level or inside each other.
    const target =
      mapped === "li"
        ? ["ul", "ol"].includes(parentTag)
          ? container
          : ensureList(container, out)
        : container;
    target.appendChild(block);
    // Headings carry their own weight; don't double-wrap them in <strong>.
    const inner = mapped.startsWith("h") ? { ...f, bold: false } : f;
    el.childNodes.forEach((c) => walk(c, block, inner, out));
    return;
  }

  // Any other element (span, font, b, i, section, table rows…) just passes
  // its formatting down to its children.
  el.childNodes.forEach((c) => walk(c, container, f, out));
}

function ensureList(container: HTMLElement, out: Document): HTMLElement {
  const last = container.lastElementChild as HTMLElement | null;
  if (last && last.tagName === "UL") return last;
  const ul = out.createElement("ul");
  container.appendChild(ul);
  return ul;
}

/** Groups stray top-level inline content into paragraphs and drops empties. */
function tidy(root: HTMLElement, out: Document) {
  const nodes = Array.from(root.childNodes);
  let para: HTMLElement | null = null;
  for (const n of nodes) {
    const isBlock = n.nodeType === Node.ELEMENT_NODE && (OUT_BLOCKS.has((n as Element).tagName.toLowerCase()) || (n as Element).tagName === "HR");
    if (isBlock) {
      para = null;
      continue;
    }
    if (n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName === "BR" && para === null) {
      root.removeChild(n);
      continue;
    }
    if (!para) {
      para = out.createElement("p");
      root.insertBefore(para, n);
    }
    para.appendChild(n);
  }
  root.querySelectorAll("p, h2, h3, h4, li, blockquote").forEach((el) => {
    // Trailing <br>s inside a block just add blank space.
    while (el.lastChild && (el.lastChild as Element).tagName === "BR") el.removeChild(el.lastChild);
    if (!el.textContent?.replace(/ /g, " ").trim()) el.remove();
  });
}

export function cleanPastedHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const out = document.implementation.createHTMLDocument("");
  const root = out.createElement("div");
  walk(parsed.body, root, { bold: false, italic: false, underline: false }, out);
  tidy(root, out);
  // Hebrew-only paragraphs that came in without a direction still read RTL.
  root.querySelectorAll("p, h2, h3, h4, blockquote, li").forEach((el) => {
    if (!el.hasAttribute("dir") && isMostlyHebrew(el.textContent || "")) el.setAttribute("dir", "rtl");
  });
  return root.innerHTML;
}

function isMostlyHebrew(text: string): boolean {
  const letters = text.match(/\p{L}/gu) || [];
  if (letters.length < 3) return false;
  const hebrew = letters.filter((c) => /[֐-׿]/.test(c)).length;
  return hebrew / letters.length > 0.6;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function plainTextToHtml(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "";
  // Blank lines separate paragraphs when present; otherwise each line is one.
  const paras = /\n\s*\n/.test(normalized) ? normalized.split(/\n\s*\n/) : normalized.split("\n");
  return paras
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const dir = isMostlyHebrew(p) ? ' dir="rtl"' : "";
      return `<p${dir}>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}
