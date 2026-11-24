import fs from "fs";
import path from "path";
import matter from "gray-matter";
import sql, { initZyDb } from "@/lib/db";
import { sanitizeEssayHtml } from "@/lib/zy-html";

/**
 * Moves the markdown archive (content/zichronyonatan) into zy_essays. On the
 * first request after each deploy it inserts any archive essay that isn't in
 * the database yet: the whole archive the first time (folding in site edits
 * from zy_archive_overrides), and afterwards only newly found essays added
 * as markdown files. Ids stay `a~<dir>~<file>` so email logs, republish marks
 * and links keep working. Existing rows are never touched, and archive essays
 * can't be deleted on the site (only hidden), so nothing comes back unbidden.
 *
 * With no CONTENT_DIR (once the markdown files are removed) it does nothing.
 */

const CONTENT_DIR = path.join(process.cwd(), "content/zichronyonatan");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The free-text `date` field as a timestamp (UTC noon), or null. */
function parseArchiveDate(date: string): Date | null {
  const at = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d, 12));
  let m = date.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return at(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = date.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (m && MONTHS.includes(m[1])) return at(Number(m[3]), MONTHS.indexOf(m[1]), Number(m[2]));
  m = date.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m && MONTHS.includes(m[1])) return at(Number(m[2]), MONTHS.indexOf(m[1]), 1);
  m = date.match(/(\d{4})/);
  if (m) return at(Number(m[1]), 0, 1);
  return null;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The archive's plain-text paragraphs (with *italics*) as editor HTML. */
export function archiveBodyToHtml(body: string): string {
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const html = escapeHtml(p)
        .replace(/\*(?=\S)([^*\n]*?\S)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>");
      // Paragraphs that open with Hebrew (e.g. a quoted pasuk) read right-to-left.
      const first = p.match(/[A-Za-z֐-׿]/);
      return first && /[֐-׿]/.test(first[0]) ? `<p dir="rtl">${html}</p>` : `<p>${html}</p>`;
    })
    .join("");
}

type OverrideRow = {
  id: string;
  parsha_slug: string | null;
  title: string | null;
  author: string | null;
  body_html: string | null;
  hidden: boolean;
};

async function runImport(): Promise<void> {
  // Also brings the schema up to date (new columns) on the first request.
  await initZyDb();
  if (!fs.existsSync(CONTENT_DIR)) return;
  const existing = new Set(
    ((await sql`SELECT id FROM zy_essays WHERE id LIKE 'a~%'`) as { id: string }[]).map((r) => r.id)
  );

  const overrides = new Map(
    ((await sql`SELECT * FROM zy_archive_overrides`) as OverrideRow[]).map((o) => [o.id, o])
  );

  const rows = [];
  for (const dir of fs.readdirSync(CONTENT_DIR)) {
    const dirPath = path.join(CONTENT_DIR, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;
    for (const file of fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"))) {
      const { data, content } = matter(fs.readFileSync(path.join(dirPath, file), "utf-8"));
      if (data.placeholder) continue;
      const id = `a~${dir}~${file.replace(/\.md$/, "")}`;
      if (existing.has(id)) continue;
      const original = {
        parsha_slug: dir,
        title: String(data.title || data.parsha || dir),
        author: String(data.author || ""),
        body_html: sanitizeEssayHtml(archiveBodyToHtml(content.trim())),
      };
      const o = overrides.get(id);
      const date = String(data.date || "");
      rows.push({
        id,
        parsha_slug: o?.parsha_slug ?? original.parsha_slug,
        title: o?.title ?? original.title,
        author: o?.author ?? original.author,
        body_html: o?.body_html ?? original.body_html,
        hidden: o?.hidden ?? false,
        essay_date: date,
        source: String(data.source || "Family archive"),
        // The original date, so imported essays never look like new uploads.
        created_at: (parseArchiveDate(date) ?? new Date(Date.UTC(2017, 0, 1, 12))).toISOString(),
        original,
      });
    }
  }
  if (!rows.length) return;

  // A single statement, so each import is all-or-nothing.
  await sql`
    INSERT INTO zy_essays
      (id, parsha_slug, title, author, body_html, hidden, essay_date, source, created_at, original)
    SELECT id, parsha_slug, title, author, body_html, hidden, essay_date, source, created_at, original
    FROM json_to_recordset(${JSON.stringify(rows)}::json) AS r(
      id TEXT, parsha_slug TEXT, title TEXT, author TEXT, body_html TEXT, hidden BOOLEAN,
      essay_date TEXT, source TEXT, created_at TIMESTAMPTZ, original JSONB
    )
    ON CONFLICT (id) DO NOTHING
  `;
  console.log(`Imported ${rows.length} archive essay(s) into zy_essays`);
}

let importing: Promise<void> | null = null;

/** Makes sure the markdown archive is in the database (once per server instance). */
export function ensureArchiveImported(): Promise<void> {
  if (!process.env.DATABASE_URL) return Promise.resolve();
  if (!importing) {
    importing = runImport().catch((error) => {
      importing = null; // retry on the next request
      throw error;
    });
  }
  return importing;
}
