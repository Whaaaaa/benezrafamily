import { getArchiveParshiot, getAuthors } from "@/lib/content-zichronyonatan";
import { sanitizeEssayHtml, hasText } from "@/lib/zy-html";

export type EssayInput = { title: string; author: string; parshaSlug: string; html: string };

/** Cleans and validates an uploaded/edited dvar Torah. */
export function validateEssayInput(
  raw: Partial<Record<keyof EssayInput, unknown>>
): { ok: true; value: EssayInput } | { ok: false; error: string } {
  const title = String(raw.title || "").trim();
  const author = String(raw.author || "").trim();
  const parshaSlug = String(raw.parshaSlug || "");
  const html = sanitizeEssayHtml(String(raw.html || ""));

  if (!title) return { ok: false, error: "Please add a title." };
  if (!author) return { ok: false, error: "Please choose an author." };
  if (!getArchiveParshiot().some((p) => p.slug === parshaSlug)) {
    return { ok: false, error: "Please choose a parsha or holiday." };
  }
  if (!hasText(html)) return { ok: false, error: "The dvar Torah is empty." };
  return { ok: true, value: { title, author, parshaSlug, html } };
}

export type ParshaGroup = { book: string; parshiot: { slug: string; parsha: string }[] };

/** Picklist options shared by the upload and edit forms. */
export async function getEssayFormOptions(): Promise<{ parshaGroups: ParshaGroup[]; authors: string[] }> {
  const groups = new Map<string, { slug: string; parsha: string }[]>();
  for (const p of getArchiveParshiot()) {
    if (!groups.has(p.book)) groups.set(p.book, []);
    groups.get(p.book)!.push({ slug: p.slug, parsha: p.parsha });
  }
  // "Unsigned (Drive archive, 2019)" etc. describe where an old essay came
  // from rather than who wrote it, so they aren't offered for new uploads.
  const authors = (await getAuthors()).filter((a) => !a.startsWith("Unsigned"));
  return {
    parshaGroups: Array.from(groups, ([book, parshiot]) => ({ book, parshiot })),
    authors,
  };
}
