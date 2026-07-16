import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content/zichronyonatan");

export type Essay = {
  slug: string;
  parsha: string;
  parshaSlug: string;
  book: string;
  bookOrder: number;
  order: number;
  date: string;
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
        essays.push({
          slug: file.replace(/\.md$/, ""),
          parsha: data.parsha || dir,
          parshaSlug: dir,
          book: data.book || "",
          bookOrder: typeof data.bookOrder === "number" ? data.bookOrder : 9,
          order: typeof data.order === "number" ? data.order : 999,
          date: data.date || "",
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
  hasVerified: boolean;
};

export function getParshiot(): ParshaSummary[] {
  const essays = getAllEssays();
  const map = new Map<string, ParshaSummary>();
  for (const e of essays) {
    const existing = map.get(e.parshaSlug);
    if (existing) {
      if (!e.placeholder) existing.count += 1;
      if (e.author && !existing.authors.includes(e.author)) {
        existing.authors.push(e.author);
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
        authors: e.author ? [e.author] : [],
        hasVerified: e.verbatim,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.bookOrder !== b.bookOrder ? a.bookOrder - b.bookOrder : a.order - b.order
  );
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

export function getEssaysForParsha(slug: string): Essay[] {
  return getAllEssays()
    .filter((e) => e.parshaSlug === slug)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getParshaMeta(slug: string): ParshaSummary | undefined {
  return getParshiot().find((p) => p.slug === slug);
}

export function totalStats() {
  const essays = getAllEssays().filter((e) => !e.placeholder);
  const authors = new Set<string>();
  essays.forEach((e) => {
    if (e.author) authors.add(e.author);
  });
  const pendingCount = getAllEssays().filter((e) => e.placeholder).length;
  return {
    essayCount: essays.length,
    parshaCount: new Set(essays.map((e) => e.parshaSlug)).size,
    authorCount: authors.size,
    pendingCount,
  };
}
