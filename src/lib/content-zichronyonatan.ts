import sql from "@/lib/db";
import { ensureArchiveImported } from "@/lib/zy-archive-import";
import { PARSHIOT, getParshaDef } from "@/lib/zy-parshiot";

/** Pulls just the year out of the free-text `date` field, for display. */
function extractYear(date: string): string {
  const m = date.match(/(\d{4})/);
  return m ? m[1] : "";
}

/**
 * "Unsigned (Gmail archive, 2019)" / "Unsigned (Drive archive, 2018)" are
 * internal sourcing notes, not meant for display -- collapse to "Unsigned".
 */
export function displayAuthor(author: string): string {
  if (!author) return "";
  return author.replace(/^(Unsigned)\s*\(.*\)$/, "$1");
}

export type Essay = {
  // zy_essays id: `up-…` for uploads, `a~<parsha>~<file>` for essays that
  // came from the original family archive.
  id: string;
  slug: string;
  parsha: string;
  parshaSlug: string;
  book: string;
  bookOrder: number;
  order: number;
  date: string;
  year: string;
  title: string;
  author: string;
  source: string;
  verbatim: boolean;
  placeholder: boolean;
  // Every essay is stored as sanitized HTML (`html`); `body` is kept empty
  // for older callers that fell back to plain text.
  body: string;
  uploaded?: boolean;
  html?: string;
  createdAt?: string;
  emailedAt?: string;
  // Archive essays only: edited through the site / hidden from the site.
  edited?: boolean;
  hidden?: boolean;
};

const ARCHIVE_PREFIX = "a~";

export function archiveId(dir: string, slug: string) {
  return `${ARCHIVE_PREFIX}${dir}~${slug}`;
}

export function isArchiveId(id: string) {
  return id.startsWith(ARCHIVE_PREFIX);
}

export function formatEssayDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Jerusalem",
  });
}

export type ArchiveOriginal = { parsha_slug: string; title: string; author: string; body_html: string };

type EssayRow = {
  id: string;
  parsha_slug: string;
  title: string;
  author: string;
  body_html: string;
  created_at: string | Date;
  emailed_at: string | Date | null;
  essay_date: string | null;
  source: string;
  hidden: boolean;
  original: ArchiveOriginal | null;
};

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** True if an archive essay differs from its original in any field. */
export function isEdited(r: Pick<EssayRow, "parsha_slug" | "title" | "author" | "body_html">, o: ArchiveOriginal | null) {
  if (!o) return false;
  return (
    r.parsha_slug !== o.parsha_slug ||
    r.title !== o.title ||
    r.author !== o.author ||
    // The editor re-serializes HTML with different whitespace, which
    // doesn't change how it renders.
    squash(r.body_html) !== squash(o.body_html)
  );
}

function toEssay(r: EssayRow): Essay {
  const archive = isArchiveId(r.id);
  const meta = getParshaDef(r.parsha_slug);
  const created = new Date(r.created_at);
  const date = archive ? r.essay_date || "" : formatEssayDate(created);
  return {
    id: r.id,
    // Archive essays keep their old anchor (the markdown file name).
    slug: archive ? r.id.split("~").pop()! : r.id,
    parsha: meta?.parsha || r.parsha_slug,
    parshaSlug: r.parsha_slug,
    book: meta?.book || "",
    bookOrder: meta?.bookOrder ?? 9,
    order: meta?.order ?? 999,
    date,
    year: extractYear(date),
    title: r.title,
    author: r.author,
    source: archive ? r.source : "Uploaded",
    verbatim: true,
    placeholder: false,
    body: "",
    uploaded: !archive,
    html: r.body_html,
    createdAt: created.toISOString(),
    emailedAt: r.emailed_at ? new Date(r.emailed_at).toISOString() : undefined,
    edited: archive ? isEdited(r, r.original) : undefined,
    hidden: r.hidden,
  };
}

/**
 * Every essay in zy_essays: site uploads plus the original family archive.
 * Hidden essays are left out unless `includeHidden` (manage pages).
 */
export async function getAllEssays({ includeHidden = false } = {}): Promise<Essay[]> {
  if (!process.env.DATABASE_URL) return [];
  await ensureArchiveImported();
  const rows = (await sql`
    SELECT id, parsha_slug, title, author, body_html, created_at, emailed_at,
           essay_date, source, hidden, original
    FROM zy_essays ORDER BY created_at DESC
  `) as EssayRow[];
  const essays = rows.map(toEssay);
  return includeHidden ? essays : essays.filter((e) => !e.hidden);
}

/** One essay by id (hidden included), for editing. */
export async function getManagedEssay(id: string): Promise<Essay | undefined> {
  return (await getAllEssays({ includeHidden: true })).find((e) => e.id === id);
}

export type ParshaSummary = {
  slug: string;
  parsha: string;
  book: string;
  bookOrder: number;
  order: number;
  count: number;
  authors: string[];
  years: string[];
  hasVerified: boolean;
};

/** Every parsha/holiday, with counts from `essays` (zero if none yet). */
function summarize(essays: Essay[]): ParshaSummary[] {
  const map = new Map<string, ParshaSummary>(
    PARSHIOT.map((p) => [p.slug, { ...p, count: 0, authors: [], years: [], hasVerified: false }])
  );
  for (const e of essays) {
    const s = map.get(e.parshaSlug);
    if (!s) continue;
    s.count += 1;
    s.hasVerified = true;
    const displayed = displayAuthor(e.author);
    if (displayed && !s.authors.includes(displayed)) s.authors.push(displayed);
    if (e.year && !s.years.includes(e.year)) s.years.push(e.year);
  }
  return Array.from(map.values())
    .map((p) => ({ ...p, years: p.years.sort() }))
    .sort((a, b) => (a.bookOrder !== b.bookOrder ? a.bookOrder - b.bookOrder : a.order - b.order));
}

export async function getParshiot(): Promise<ParshaSummary[]> {
  return summarize(await getAllEssays());
}

/** The fixed parsha/holiday list — no DB round trip (counts are zero). */
export function getArchiveParshiot(): ParshaSummary[] {
  return summarize([]);
}

export async function getBooks(): Promise<
  { book: string; bookOrder: number; parshiot: ParshaSummary[] }[]
> {
  const parshiot = await getParshiot();
  const map = new Map<string, { book: string; bookOrder: number; parshiot: ParshaSummary[] }>();
  for (const p of parshiot) {
    const key = p.book;
    if (!map.has(key)) map.set(key, { book: p.book, bookOrder: p.bookOrder, parshiot: [] });
    map.get(key)!.parshiot.push(p);
  }
  return Array.from(map.values()).sort((a, b) => a.bookOrder - b.bookOrder);
}

export type EssaySort = "date" | "author";

// Archive essays were stored with their original date as created_at.
function essayTime(e: Essay): number {
  return e.createdAt ? Date.parse(e.createdAt) : 0;
}

export async function getEssaysForParsha(slug: string, sort: EssaySort = "date"): Promise<Essay[]> {
  const essays = (await getAllEssays()).filter((e) => e.parshaSlug === slug);
  if (sort === "author") {
    return essays.sort((a, b) => {
      const byAuthor = displayAuthor(a.author).localeCompare(displayAuthor(b.author));
      return byAuthor !== 0 ? byAuthor : essayTime(b) - essayTime(a);
    });
  }
  return essays.sort((a, b) => essayTime(b) - essayTime(a));
}

export async function getParshaMeta(slug: string): Promise<ParshaSummary | undefined> {
  return (await getParshiot()).find((p) => p.slug === slug);
}

export async function getAuthors(): Promise<string[]> {
  const authors = new Set<string>();
  for (const e of await getAllEssays()) {
    if (e.author) authors.add(e.author);
  }
  return Array.from(authors).sort((a, b) => a.localeCompare(b));
}

export async function totalStats() {
  const essays = await getAllEssays();
  const parshiot = summarize(essays);
  const authors = new Set<string>();
  essays.forEach((e) => {
    const displayed = displayAuthor(e.author);
    if (displayed) authors.add(displayed);
  });
  return {
    essayCount: essays.length,
    parshaCount: new Set(essays.map((e) => e.parshaSlug)).size,
    authorCount: authors.size,
    pendingCount: parshiot.filter((p) => p.count === 0).length,
  };
}
