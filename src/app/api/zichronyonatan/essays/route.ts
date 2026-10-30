import { revalidatePath } from "next/cache";
import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { validateEssayInput } from "@/lib/zy-essays";

export async function POST(req: Request) {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();

  const result = validateEssayInput(await req.json());
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  const { title, author, parshaSlug, html } = result.value;

  const id = `up-${crypto.randomUUID()}`;
  await sql`
    INSERT INTO zy_essays (id, parsha_slug, title, author, body_html)
    VALUES (${id}, ${parshaSlug}, ${title}, ${author}, ${html})
  `;

  revalidatePath("/zichronyonatan");
  revalidatePath(`/zichronyonatan/parsha/${parshaSlug}`);

  return Response.json({ ok: true, id, url: `/zichronyonatan/parsha/${parshaSlug}` });
}
