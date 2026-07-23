import fs from "fs";
import path from "path";
import matter from "gray-matter";

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
};

export function getAllEssays(): Essay[] {
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
        essays.push({
          slug: file.replace(/\.md$/, ""),
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
          body: content.trim(),
        });
      }
    }
    return essays;
  } catch (error) {
    console.error("Error loading essays from", CONTENT_DIR, error);
    return [];
  }
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

export function getParshiot(): ParshaSummary[] {
  const essays = getAllEssays();
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

export function getBooks(): { book: string; bookOrder: number; parshiot: ParshaSummary[] }[] {
  const parshiot = getParshiot();
  const map = new Map<string, { book: string; bookOrder: number; parshiot: ParshaSummary[] }>();
  for (const p of parshiot) {
    const key = p.book;
    if (!map.has(key)) map.set(key, { book: p.book, bookOrder: p.bookOrder, parshiot: [] });
    map.get(key)!.parshiot.push(p);
  }
  return Array.from(map.values()).sort((a, b) => a.bookOrder - b.bookOrder);
}

export type EssaySort = "date" | "author";

export function getEssaysForParsha(slug: string, sort: EssaySort = "date"): Essay[] {
  const essays = getAllEssays().filter((e) => e.parshaSlug === slug);
  if (sort === "author") {
    return essays.sort((a, b) => {
      const byAuthor = displayAuthor(a.author).localeCompare(displayAuthor(b.author));
      return byAuthor !== 0 ? byAuthor : parseDateForSort(b.date) - parseDateForSort(a.date);
    });
  }
  return essays.sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date));
}

export function getParshaMeta(slug: string): ParshaSummary | undefined {
  return getParshiot().find((p) => p.slug === slug);
}

export function totalStats() {
  const essays = getAllEssays().filter((e) => !e.placeholder);
  const authors = new Set<string>();
  essays.forEach((e) => {
    const displayed = displayAuthor(e.author);
    if (displayed) authors.add(displayed);
  });
  const pendingCount = getAllEssays().filter((e) => e.placeholder).length;
  return {
    essayCount: essays.length,
    parshaCount: new Set(essays.map((e) => e.parshaSlug)).size,
    authorCount: authors.size,
    pendingCount,
  };
}
