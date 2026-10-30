import { revalidatePath } from "next/cache";
import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { validateEssayInput } from "@/lib/zy-essays";
import type { ZyEssayRow } from "@/lib/zy-email";

function revalidate(...slugs: string[]) {
  revalidatePath("/zichronyonatan");
  for (const slug of new Set(slugs)) revalidatePath(`/zichronyonatan/parsha/${slug}`);
}

// Accepts any subset of { title, author, parshaSlug, html } — the manage list
// recategorizes with just { parshaSlug }, the edit page sends everything.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();
  const { id } = await params;

  const rows = (await sql`SELECT * FROM zy_essays WHERE id = ${id}`) as ZyEssayRow[];
  const existing = rows[0];
  if (!existing) return Response.json({ error: "Dvar Torah not found" }, { status: 404 });

  const patch = await req.json();
  const result = validateEssayInput({
    title: existing.title,
    author: existing.author,
    parshaSlug: existing.parsha_slug,
    html: existing.body_html,
    ...patch,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  const { title, author, parshaSlug, html } = result.value;

  await sql`
    UPDATE zy_essays
    SET title = ${title}, author = ${author}, parsha_slug = ${parshaSlug}, body_html = ${html}
    WHERE id = ${id}
  `;
  revalidate(existing.parsha_slug, parshaSlug);

  return Response.json({ ok: true, url: `/zichronyonatan/parsha/${parshaSlug}` });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();
  const { id } = await params;
  const rows = (await sql`DELETE FROM zy_essays WHERE id = ${id} RETURNING parsha_slug`) as {
    parsha_slug: string;
  }[];
  if (rows[0]) revalidate(rows[0].parsha_slug);
  else revalidatePath("/zichronyonatan");
  return Response.json({ ok: true });
}
