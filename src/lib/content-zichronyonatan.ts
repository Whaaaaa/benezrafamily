import fs from "fs";
import path from "path";
import matter from "gray-matter";
import sql from "@/lib/db";

const CONTENT_DIR = path.join(process.cwd(), "content/zichronyonatan");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Best-effort chronological sort key for the free-text `date` field. */
function parseDateForSort(date: string): number {
  if (!date) return 0;

  let m = date.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();

  m = date.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[1]);
    if (mi >= 0) return new Date(Number(m[3]), mi, Number(m[2])).getTime();
  }

  m = date.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[1]);
    if (mi >= 0) return new Date(Number(m[2]), mi, 1).getTime();
  }

  m = date.match(/(\d{4})/);
  if (m) return new Date(Number(m[1]), 0, 1).getTime();

  return 0;
}

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
  // Stable id used by the manage pages: the zy_essays id for uploads,
  // archiveId(dir, slug) for markdown essays.
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
  body: string;
  // `html` is set for Divrei Torah uploaded through the site and for archive
  // essays whose text was edited there; it's sanitized on save and rendered
  // as-is in place of `body`.
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

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The markdown archive's plain paragraphs as HTML, for the editor. */
export function archiveBodyToHtml(body: string): string {
  return body
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function getArchiveEssays(): Essay[] {
  try {
    if (!fs.existsSync(CONTENT_DIR)) return [];
    const essays: Essay[] = [];
    const parshaDirs = fs
      .readdirSync(CONTENT_DIR)
      .filter((f) => fs.statSync(path.join(CONTENT_DIR, f)).isDirectory());
    for (const dir of parshaDirs) {
      const dirPath = path.join(CONTENT_DIR, dir);
      const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));
      for (const file of files) {
        const raw = fs.readFileSync(path.join(dirPath, file), "utf-8");
        const { data, content } = matter(raw);
        const date = data.date || "";
        const slug = file.replace(/\.md$/, "");
        essays.push({
          id: archiveId(dir, slug),
          slug,
          parsha: data.parsha || dir,
          parshaSlug: dir,
          book: data.book || "",
          bookOrder: typeof data.bookOrder === "number" ? data.bookOrder : 9,
          order: typeof data.order === "number" ? data.order : 999,
          date,
          year: extractYear(date),
          title: data.title || data.parsha || dir,
          author: data.author || "",
          source: data.source || "",
          verbatim: !!data.verbatim,
          placeholder: !!data.placeholder,
          // Normalize CRLF (Windows checkouts) so paragraph splitting works.
          body: content.replace(/\r\n?/g, "\n").trim(),
        });
      }
    }
    return essays;
  } catch (error) {
    console.error("Error loading essays from", CONTENT_DIR, error);
    return [];
  }
}

export function formatEssayDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Jerusalem",
  });
}

type UploadedRow = {
  id: string;
  parsha_slug: string;
  title: string;
  author: string;
  body_html: string;
  created_at: string | Date;
  emailed_at: string | Date | null;
};

type OverrideRow = {
  id: string;
  parsha_slug: string | null;
  title: string | null;
  author: string | null;
  body_html: string | null;
  hidden: boolean;
};

type ParshaInfo = { parsha: string; book: string; bookOrder: number; order: number };

// Uploads and recategorized essays are always filed under a parsha that
// exists in the archive, so they borrow its display name and ordering.
function parshaInfo(archive: Essay[], slug: string): ParshaInfo | undefined {
  const e = archive.find((a) => a.parshaSlug === slug);
  return e && { parsha: e.parsha, book: e.book, bookOrder: e.bookOrder, order: e.order };
}

async function getUploadedEssays(archive: Essay[]): Promise<Essay[]> {
  if (!process.env.DATABASE_URL) return [];
  let rows: UploadedRow[];
  try {
    rows = (await sql`
      SELECT id, parsha_slug, title, author, body_html, created_at, emailed_at
      FROM zy_essays ORDER BY created_at DESC
    `) as UploadedRow[];
  } catch {
    // Table not created yet (no uploads so far) or DB unreachable — the
    // archive still renders from the markdown files.
    return [];
  }
  return rows.map((r) => {
    const meta = parshaInfo(archive, r.parsha_slug);
    const created = new Date(r.created_at);
    const date = formatEssayDate(created);
    return {
      id: r.id,
      slug: r.id,
      parsha: meta?.parsha || r.parsha_slug,
      parshaSlug: r.parsha_slug,
      book: meta?.book || "",
      bookOrder: meta?.bookOrder ?? 9,
      order: meta?.order ?? 999,
      date,
      year: extractYear(date),
      title: r.title,
      author: r.author,
      source: "Uploaded",
      verbatim: true,
      placeholder: false,
      body: "",
      uploaded: true,
      html: r.body_html,
      createdAt: created.toISOString(),
      emailedAt: r.emailed_at ? new Date(r.emailed_at).toISOString() : undefined,
    };
  });
}

async function getOverrides(): Promise<Map<string, OverrideRow>> {
  if (!process.env.DATABASE_URL) return new Map();
  try {
    const rows = (await sql`SELECT * FROM zy_archive_overrides`) as OverrideRow[];
    return new Map(rows.map((r) => [r.id, r]));
  } catch {
    return new Map(); // table not created yet: nothing has been edited
  }
}

function applyOverride(e: Essay, o: OverrideRow | undefined, archive: Essay[]): Essay {
  if (!o) return e;
  const moved = o.parsha_slug && o.parsha_slug !== e.parshaSlug ? parshaInfo(archive, o.parsha_slug) : undefined;
  return {
    ...e,
    ...(moved && o.parsha_slug ? { ...moved, parshaSlug: o.parsha_slug } : {}),
    title: o.title ?? e.title,
    author: o.author ?? e.author,
    html: o.body_html ?? undefined,
    edited: o.parsha_slug !== null || o.title !== null || o.author !== null || o.body_html !== null,
    hidden: o.hidden,
  };
}

/**
 * Every essay: uploads plus the markdown archive with any site edits applied.
 * Hidden archive essays are left out unless `includeHidden` (manage pages).
 */
export async function getAllEssays({ includeHidden = false } = {}): Promise<Essay[]> {
  const archive = getArchiveEssays();
  const [uploaded, overrides] = await Promise.all([getUploadedEssays(archive), getOverrides()]);
  const merged = archive.map((e) => applyOverride(e, overrides.get(e.id), archive));
  return [...uploaded, ...(includeHidden ? merged : merged.filter((e) => !e.hidden))];
}

/** The original (unedited) markdown essay for an archive id. */
export function getOriginalArchiveEssay(id: string): Essay | undefined {
  return getArchiveEssays().find((e) => e.id === id);
}

/** One essay by id (uploaded or archive, hidden included), for editing. */
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

function summarize(essays: Essay[]): ParshaSummary[] {
  const map = new Map<string, ParshaSummary>();
  for (const e of essays) {
    const existing = map.get(e.parshaSlug);
    const displayed = displayAuthor(e.author);
    if (existing) {
      if (!e.placeholder) existing.count += 1;
      if (displayed && !existing.authors.includes(displayed)) {
        existing.authors.push(displayed);
      }
      if (e.year && !e.placeholder && !existing.years.includes(e.year)) {
        existing.years.push(e.year);
      }
      if (e.verbatim) existing.hasVerified = true;
    } else {
      map.set(e.parshaSlug, {
        slug: e.parshaSlug,
        parsha: e.parsha,
        book: e.book,
        bookOrder: e.bookOrder,
        order: e.order,
        count: e.placeholder ? 0 : 1,
        authors: displayed ? [displayed] : [],
        years: e.year && !e.placeholder ? [e.year] : [],
        hasVerified: e.verbatim,
      });
    }
  }
  return Array.from(map.values())
    .map((p) => ({ ...p, years: p.years.sort() }))
    .sort((a, b) => (a.bookOrder !== b.bookOrder ? a.bookOrder - b.bookOrder : a.order - b.order));
}

export async function getParshiot(): Promise<ParshaSummary[]> {
  return summarize(await getAllEssays());
}

/** Parsha list from the markdown archive only — no DB round trip. */
export function getArchiveParshiot(): ParshaSummary[] {
  return summarize(getArchiveEssays());
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

function essayTime(e: Essay): number {
  return e.createdAt ? Date.parse(e.createdAt) : parseDateForSort(e.date);
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
    if (e.author && !e.placeholder) authors.add(e.author);
  }
  return Array.from(authors).sort((a, b) => a.localeCompare(b));
}

export async function totalStats() {
  const all = await getAllEssays();
  const essays = all.filter((e) => !e.placeholder);
  const authors = new Set<string>();
  essays.forEach((e) => {
    const displayed = displayAuthor(e.author);
    if (displayed) authors.add(displayed);
  });
  const pendingCount = all.filter((e) => e.placeholder).length;
  return {
    essayCount: essays.length,
    parshaCount: new Set(essays.map((e) => e.parshaSlug)).size,
    authorCount: authors.size,
    pendingCount,
  };
}
