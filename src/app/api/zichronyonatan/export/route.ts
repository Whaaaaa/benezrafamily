import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { getAllEssays } from "@/lib/content-zichronyonatan";
import { getBookSettings } from "@/lib/zy-book";
import { PARSHIOT } from "@/lib/zy-parshiot";

// The printed book's contents as JSON: the front matter from the admin page
// and every Dvar Torah selected for the book (hidden ones included if
// selected). book/build.py reads this file from book/data/essays.json.
export async function GET() {
  if (!(await isZyAuthed())) return unauthorized();
  const [essays, book] = await Promise.all([getAllEssays({ includeHidden: true }), getBookSettings()]);
  const body = {
    exportedAt: new Date().toISOString(),
    book,
    parshiot: PARSHIOT,
    essays: essays
      .filter((e) => e.inBook)
      .map((e) => ({
        id: e.id,
        parshaSlug: e.parshaSlug,
        title: e.title,
        author: e.author,
        date: e.date,
        createdAt: e.createdAt,
        source: e.source,
        uploaded: !!e.uploaded,
        html: e.html ?? "",
      })),
  };
  return new Response(JSON.stringify(body, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="essays.json"',
      "Cache-Control": "no-store",
    },
  });
}
