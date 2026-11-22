import { revalidatePath } from "next/cache";
import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { validateEssayInput } from "@/lib/zy-essays";
import { getManagedEssay, isArchiveId, type ArchiveOriginal } from "@/lib/content-zichronyonatan";
import type { ZyEssayRow } from "@/lib/zy-email";
import { setRepublish } from "@/lib/zy-republish";

function revalidate(...slugs: string[]) {
  revalidatePath("/zichronyonatan");
  for (const slug of new Set(slugs)) revalidatePath(`/zichronyonatan/parsha/${slug}`);
}

type Row = ZyEssayRow & { hidden: boolean; original: ArchiveOriginal | null };

// Accepts any subset of { title, author, parshaSlug, html, hidden } — the
// manage list recategorizes with just { parshaSlug } or hides with
// { hidden }, the edit page sends everything. Archive essays also accept
// `{ revert: true }`, which restores the original text.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();
  const { id } = await params;
  const patch = await req.json();

  // `{ republish }` alone marks/unmarks it for the weekly email's fallback.
  if (typeof patch.republish === "boolean") {
    if (!(await getManagedEssay(id))) return Response.json({ error: "Dvar Torah not found" }, { status: 404 });
    await setRepublish(id, patch.republish);
    return Response.json({ ok: true });
  }

  const rows = (await sql`SELECT * FROM zy_essays WHERE id = ${id}`) as Row[];
  const existing = rows[0];
  if (!existing) return Response.json({ error: "Dvar Torah not found" }, { status: 404 });
  const archive = isArchiveId(id);

  if (patch.revert) {
    const o = existing.original;
    if (!archive || !o) return Response.json({ error: "Nothing to revert to." }, { status: 400 });
    await sql`
      UPDATE zy_essays
      SET parsha_slug = ${o.parsha_slug}, title = ${o.title}, author = ${o.author}, body_html = ${o.body_html}
      WHERE id = ${id}
    `;
    revalidate(existing.parsha_slug, o.parsha_slug);
    return Response.json({ ok: true, url: `/zichronyonatan/parsha/${o.parsha_slug}` });
  }

  const result = validateEssayInput(
    {
      title: existing.title,
      author: existing.author,
      parshaSlug: existing.parsha_slug,
      html: existing.body_html,
      ...patch,
    },
    // Some archive essays are unsigned.
    { requireAuthor: !archive }
  );
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  const { title, author, parshaSlug, html } = result.value;
  const hidden = typeof patch.hidden === "boolean" ? patch.hidden : existing.hidden;

  await sql`
    UPDATE zy_essays
    SET title = ${title}, author = ${author}, parsha_slug = ${parshaSlug}, body_html = ${html},
        hidden = ${hidden}
    WHERE id = ${id}
  `;
  revalidate(existing.parsha_slug, parshaSlug);

  return Response.json({ ok: true, url: `/zichronyonatan/parsha/${parshaSlug}` });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isZyAuthed())) return unauthorized();
  const { id } = await params;
  if (isArchiveId(id)) {
    return Response.json({ error: "Archive essays can be hidden, not deleted." }, { status: 400 });
  }
  await initZyDb();
  const rows = (await sql`DELETE FROM zy_essays WHERE id = ${id} RETURNING parsha_slug`) as {
    parsha_slug: string;
  }[];
  await setRepublish(id, false);
  if (rows[0]) revalidate(rows[0].parsha_slug);
  else revalidatePath("/zichronyonatan");
  return Response.json({ ok: true });
}
