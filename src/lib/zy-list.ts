const EMAIL_RE = /[A-Z0-9._%+'-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/i;
const EMAIL_RE_G = new RegExp(EMAIL_RE.source, "gi");

/**
 * Parses a pasted mailing list. Accepts one address per line, comma/semicolon
 * separated lists, `Name <email>` (as copied from Gmail), or rows copied out
 * of a spreadsheet (`Name<TAB>email`). Returns email → name (may be "").
 */
export function parseList(text: string) {
  const entries = new Map<string, string>();
  const unreadable: string[] = [];
  // Commas only separate entries when a line holds several addresses, so
  // "Levi, David <david@example.com>" keeps its name intact.
  const segments = text.split(/[\n;]/).flatMap((line) =>
    (line.match(EMAIL_RE_G) || []).length > 1 ? line.split(",") : [line]
  );
  for (const seg of segments) {
    if (!seg.trim()) continue;
    const match = seg.match(EMAIL_RE);
    if (!match) {
      unreadable.push(seg.trim());
      continue;
    }
    const email = match[0].toLowerCase();
    const name = seg
      .replace(match[0], "")
      .replace(/[<>"\t]|mailto:/g, " ")
      .replace(/^[\s,]+|[\s,]+$/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 100);
    if (!entries.has(email) || (!entries.get(email) && name)) entries.set(email, name);
  }
  return { entries, unreadable };
}
