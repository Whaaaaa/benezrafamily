import sql from "@/lib/db";

// The printed book's front matter, edited on the admin page and included in
// the "Download book data" export that book/build.py reads.

export type BookSettings = {
  title: string;
  subtitle: string;
  credit: string;
  copyrightHolder: string;
  copyrightYear: string;
  isbn: string;
  // Plain text: blank lines separate paragraphs, *asterisks* for italics.
  dedication: string;
  introduction: string;
};

export const DEFAULT_BOOK: BookSettings = {
  title: "Zichron Yonatan",
  subtitle: "Divrei Torah on the Weekly Parsha and the Festivals",
  credit: "The BenEzra Family",
  copyrightHolder: "The BenEzra Family",
  copyrightYear: String(new Date().getFullYear()),
  isbn: "",
  dedication: "",
  introduction:
    "The essays in this book are reproduced as they were originally written and sent, beginning in 2017.",
};

const FIELDS = Object.keys(DEFAULT_BOOK) as (keyof BookSettings)[];
const LIMITS: Partial<Record<keyof BookSettings, number>> = { dedication: 5000, introduction: 30000 };

export async function getBookSettings(): Promise<BookSettings> {
  if (!process.env.DATABASE_URL) return DEFAULT_BOOK;
  try {
    const rows = (await sql`SELECT settings FROM zy_book WHERE id = 1`) as { settings: Partial<BookSettings> }[];
    return { ...DEFAULT_BOOK, ...(rows[0]?.settings ?? {}) };
  } catch {
    return DEFAULT_BOOK; // table not created yet
  }
}

/** Keeps only known fields, as trimmed strings within their length limits. */
export function cleanBookSettings(raw: unknown): { ok: true; value: BookSettings } | { ok: false; error: string } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const value = { ...DEFAULT_BOOK };
  for (const f of FIELDS) {
    if (input[f] === undefined) continue;
    const s = String(input[f] ?? "").replace(/\r\n?/g, "\n").trim();
    if (s.length > (LIMITS[f] ?? 300)) return { ok: false, error: `The ${f} is too long.` };
    value[f] = s;
  }
  if (!value.title) return { ok: false, error: "The book needs a title." };
  return { ok: true, value };
}

export async function saveBookSettings(settings: BookSettings) {
  await sql`
    INSERT INTO zy_book (id, settings, updated_at) VALUES (1, ${JSON.stringify(settings)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()
  `;
}
