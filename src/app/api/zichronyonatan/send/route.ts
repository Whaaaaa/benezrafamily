import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { getNextScheduled, logEmail, sendEssay, sendEssayToList, type ZyEssayRow } from "@/lib/zy-email";

export const maxDuration = 300;

// Manual sends from the mailing-list admin page: a test to one address, or
// the full list. After a list send the response describes the next scheduled
// email so the page can offer to cancel it.
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
      await logEmail({ kind: "test", essay, recipients: sent, failed, note: `Test to ${to}` });
      if (failed.length) return Response.json({ error: `Sending to ${to} failed` }, { status: 500 });
      return Response.json({ ok: true, sent });
    }

    const result = await sendEssayToList(essay, "manual");
    const next = await getNextScheduled();
    return Response.json({
      ok: true,
      ...result,
      next: {
        sendDate: next.sendDate,
        label: next.label,
        parsha: next.parsha,
        essayTitle: next.essay?.title ?? null,
        // The scheduled run never re-sends something already emailed.
        sameAsSent: next.essay?.id === essay.id,
        cancelled: next.cancelled,
      },
    });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
