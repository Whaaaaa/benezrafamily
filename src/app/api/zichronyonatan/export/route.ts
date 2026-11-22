import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { getAllEssays } from "@/lib/content-zichronyonatan";
import { PARSHIOT } from "@/lib/zy-parshiot";

// Every Dvar Torah shown on the site, as JSON, for building the printed book
// (book/build.py reads this file from book/data/essays.json).
export async function GET() {
  if (!(await isZyAuthed())) return unauthorized();
  const essays = await getAllEssays();
  const body = {
    exportedAt: new Date().toISOString(),
    parshiot: PARSHIOT,
    essays: essays.map((e) => ({
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
