import { revalidatePath } from "next/cache";
import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { validateEssayInput } from "@/lib/zy-essays";
import { getManagedEssay, isArchiveId, isEdited, type ArchiveOriginal } from "@/lib/content-zichronyonatan";
import type { ZyEssayRow } from "@/lib/zy-email";
import { setRepublish } from "@/lib/zy-republish";

function revalidate(...slugs: string[]) {
  revalidatePath("/zichronyonatan");
  for (const slug of new Set(slugs)) revalidatePath(`/zichronyonatan/parsha/${slug}`);
}

type Row = ZyEssayRow & { hidden: boolean; original: ArchiveOriginal | null };

// One essay's editable fields, for the inline editor on the manage page.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isZyAuthed())) return unauthorized();
  const { id } = await params;
  const rows = (await sql`
    SELECT id, title, author, parsha_slug, body_html FROM zy_essays WHERE id = ${id}
  `) as Pick<Row, "id" | "title" | "author" | "parsha_slug" | "body_html">[];
  const r = rows[0];
  if (!r) return Response.json({ error: "Dvar Torah not found" }, { status: 404 });
  return Response.json({ id: r.id, title: r.title, author: r.author, parshaSlug: r.parsha_slug, html: r.body_html });
}

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

  // `{ inBook }` alone adds it to / removes it from the printed book.
  if (typeof patch.inBook === "boolean") {
    const updated = await sql`UPDATE zy_essays SET in_book = ${patch.inBook} WHERE id = ${id} RETURNING id`;
    if (!updated.length) return Response.json({ error: "Dvar Torah not found" }, { status: 404 });
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
    return Response.json({
      ok: true,
      url: `/zichronyonatan/parsha/${o.parsha_slug}`,
      essay: { title: o.title, author: o.author, parshaSlug: o.parsha_slug, html: o.body_html, edited: false },
    });
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

  // What was saved, so the manage page can update its row without a reload.
  const edited = archive && isEdited({ parsha_slug: parshaSlug, title, author, body_html: html }, existing.original);
  return Response.json({
    ok: true,
    url: `/zichronyonatan/parsha/${parshaSlug}`,
    essay: { title, author, parshaSlug, html, edited, hidden },
  });
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
