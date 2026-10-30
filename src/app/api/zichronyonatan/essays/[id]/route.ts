import { revalidatePath } from "next/cache";
import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { validateEssayInput } from "@/lib/zy-essays";
import { sanitizeEssayHtml } from "@/lib/zy-html";
import {
  archiveBodyToHtml,
  getManagedEssay,
  getOriginalArchiveEssay,
  isArchiveId,
} from "@/lib/content-zichronyonatan";
import type { ZyEssayRow } from "@/lib/zy-email";

function revalidate(...slugs: string[]) {
  revalidatePath("/zichronyonatan");
  for (const slug of new Set(slugs)) revalidatePath(`/zichronyonatan/parsha/${slug}`);
}

// Archive essays live in git (content/zichronyonatan) and can't be written at
// runtime, so edits to them are stored in zy_archive_overrides — only the
// fields that differ from the original. `{ revert: true }` drops all edits;
// `{ hidden }` hides/restores the essay on the site.
async function patchArchive(id: string, patch: Record<string, unknown>) {
  const original = getOriginalArchiveEssay(id);
  const current = await getManagedEssay(id);
  if (!original || !current || original.placeholder) {
    return Response.json({ error: "Dvar Torah not found" }, { status: 404 });
  }

  if (patch.revert) {
    await sql`DELETE FROM zy_archive_overrides WHERE id = ${id}`;
    revalidate(original.parshaSlug, current.parshaSlug);
    return Response.json({ ok: true, url: `/zichronyonatan/parsha/${original.parshaSlug}` });
  }

  const originalHtml = sanitizeEssayHtml(archiveBodyToHtml(original.body));
  const result = validateEssayInput(
    {
      title: current.title,
      author: current.author,
      parshaSlug: current.parshaSlug,
      html: current.html ?? originalHtml,
      ...patch,
    },
    { requireAuthor: false }
  );
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  const v = result.value;

  const parsha = v.parshaSlug === original.parshaSlug ? null : v.parshaSlug;
  const title = v.title === original.title ? null : v.title;
  const author = v.author === original.author ? null : v.author;
  // The editor re-serializes HTML with different whitespace, which doesn't
  // change how it renders — only store the body if the text really changed.
  const squash = (s: string) => s.replace(/\s+/g, " ").trim();
  const body = squash(v.html) === squash(originalHtml) ? null : v.html;
  const hidden = typeof patch.hidden === "boolean" ? patch.hidden : !!current.hidden;

  if (parsha === null && title === null && author === null && body === null && !hidden) {
    await sql`DELETE FROM zy_archive_overrides WHERE id = ${id}`;
  } else {
    await sql`
      INSERT INTO zy_archive_overrides (id, parsha_slug, title, author, body_html, hidden, updated_at)
      VALUES (${id}, ${parsha}, ${title}, ${author}, ${body}, ${hidden}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        parsha_slug = EXCLUDED.parsha_slug, title = EXCLUDED.title, author = EXCLUDED.author,
        body_html = EXCLUDED.body_html, hidden = EXCLUDED.hidden, updated_at = NOW()
    `;
  }
  revalidate(original.parshaSlug, current.parshaSlug, v.parshaSlug);
  return Response.json({ ok: true, url: `/zichronyonatan/parsha/${v.parshaSlug}` });
}

// Accepts any subset of { title, author, parshaSlug, html } — the manage list
// recategorizes with just { parshaSlug }, the edit page sends everything.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();
  const { id } = await params;
  const patch = await req.json();

  if (isArchiveId(id)) return patchArchive(id, patch);

  const rows = (await sql`SELECT * FROM zy_essays WHERE id = ${id}`) as ZyEssayRow[];
  const existing = rows[0];
  if (!existing) return Response.json({ error: "Dvar Torah not found" }, { status: 404 });

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
  const { id } = await params;
  if (isArchiveId(id)) {
    return Response.json({ error: "Archive essays can be hidden, not deleted." }, { status: 400 });
  }
  await initZyDb();
  const rows = (await sql`DELETE FROM zy_essays WHERE id = ${id} RETURNING parsha_slug`) as {
    parsha_slug: string;
  }[];
  if (rows[0]) revalidate(rows[0].parsha_slug);
  else revalidatePath("/zichronyonatan");
  return Response.json({ ok: true });
}
