import { revalidatePath } from "next/cache";
import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { sanitizeEssayHtml, hasText } from "@/lib/zy-html";
import { getArchiveParshiot } from "@/lib/content-zichronyonatan";

export async function POST(req: Request) {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();

  const { title, author, parshaSlug, html } = await req.json();
  const cleanTitle = String(title || "").trim();
  const cleanAuthor = String(author || "").trim();
  const slug = String(parshaSlug || "");
  const body = sanitizeEssayHtml(String(html || ""));

  if (!cleanTitle) return Response.json({ error: "Please add a title." }, { status: 400 });
  if (!cleanAuthor) return Response.json({ error: "Please choose an author." }, { status: 400 });
  if (!getArchiveParshiot().some((p) => p.slug === slug)) {
    return Response.json({ error: "Please choose a parsha or holiday." }, { status: 400 });
  }
  if (!hasText(body)) return Response.json({ error: "The dvar Torah is empty." }, { status: 400 });

  const id = `up-${crypto.randomUUID()}`;
  await sql`
    INSERT INTO zy_essays (id, parsha_slug, title, author, body_html)
    VALUES (${id}, ${slug}, ${cleanTitle}, ${cleanAuthor}, ${body})
  `;

  revalidatePath("/zichronyonatan");
  revalidatePath(`/zichronyonatan/parsha/${slug}`);

  return Response.json({ ok: true, id, url: `/zichronyonatan/parsha/${slug}` });
}
