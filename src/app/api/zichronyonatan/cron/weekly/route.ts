import sql from "@/lib/db";
import { getWeeklyEssay, sendEssayToList } from "@/lib/zy-email";

export const maxDuration = 300;

// Weekly mailing (scheduled in vercel.json). Sends the most recent dvar Torah
// uploaded for the coming Shabbat's parsha, once. If nothing was uploaded for
// this week, nothing goes out.
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("authorization")?.replace("Bearer ", "");
    if (provided !== secret) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parsha, essay } = await getWeeklyEssay();
  const log = async (note: string) => {
    await sql`INSERT INTO zy_email_log (id, note) VALUES (${crypto.randomUUID()}, ${note})`;
  };

  if (!essay) {
    await log(`weekly: skipped, no dvar Torah uploaded for ${parsha ?? "this week"}`);
    return Response.json({ ok: true, skipped: "no essay for this week", parsha });
  }
  if (essay.emailed_at) {
    await log(`weekly: skipped, "${essay.title}" was already sent`);
    return Response.json({ ok: true, skipped: "already sent", parsha });
  }

  const { sent, failed } = await sendEssayToList(essay, "weekly");
  return Response.json({ ok: true, parsha, essay: essay.title, sent, failed });
}

export async function GET(req: Request) {
  try {
    return await run(req);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
