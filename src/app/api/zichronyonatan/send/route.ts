import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { sendEssay, sendEssayToList, type ZyEssayRow } from "@/lib/zy-email";

export const maxDuration = 300;

// Manual sends from the mailing-list admin page: a test to one address, or
// the full list (e.g. when a dvar Torah is uploaded after the weekly send).
export async function POST(req: Request) {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();
  const { essayId, mode, testEmail } = await req.json();

  const rows = (await sql`SELECT * FROM zy_essays WHERE id = ${essayId}`) as ZyEssayRow[];
  const essay = rows[0];
  if (!essay) return Response.json({ error: "Dvar Torah not found" }, { status: 404 });

  try {
    if (mode === "test") {
      const to = String(testEmail || "").trim();
      if (!to.includes("@")) return Response.json({ error: "Enter an email address for the test." }, { status: 400 });
      const { sent, failed } = await sendEssay(essay, [{ email: to, name: "", token: "test-preview" }]);
      if (failed.length) return Response.json({ error: `Sending to ${to} failed` }, { status: 500 });
      return Response.json({ ok: true, sent });
    }
    const result = await sendEssayToList(essay, "manual send");
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
