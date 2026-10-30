import { revalidatePath } from "next/cache";
import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed, unauthorized } from "@/lib/zy-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();
  const { id } = await params;
  const rows = (await sql`DELETE FROM zy_essays WHERE id = ${id} RETURNING parsha_slug`) as {
    parsha_slug: string;
  }[];
  revalidatePath("/zichronyonatan");
  if (rows[0]) revalidatePath(`/zichronyonatan/parsha/${rows[0].parsha_slug}`);
  return Response.json({ ok: true });
}
