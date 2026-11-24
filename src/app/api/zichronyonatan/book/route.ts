import { initZyDb } from "@/lib/db";
import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { cleanBookSettings, saveBookSettings } from "@/lib/zy-book";

// Saves the book's title page, copyright details, dedication and introduction.
export async function PUT(req: Request) {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();
  const result = cleanBookSettings(await req.json().catch(() => null));
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  await saveBookSettings(result.value);
  return Response.json({ ok: true });
}
