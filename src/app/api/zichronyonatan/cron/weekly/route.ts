import { initZyDb } from "@/lib/db";
import {
  getNextSendDate,
  getWeeklyEssay,
  inSendWindow,
  israelParts,
  isSendCancelled,
  logEmail,
  sendEssayToList,
} from "@/lib/zy-email";

export const maxDuration = 300;

// Weekly mailing, Fridays at 3:00 PM Israel time. vercel.json calls this at
// both 12:00 and 13:00 UTC (Israel is UTC+2 or +3 depending on DST); only the
// run that falls in the Israel-time send window does anything, and the log
// entry it writes stops the other run from sending again.
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("authorization")?.replace("Bearer ", "");
    if (provided !== secret) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  if (!inSendWindow(now)) {
    return Response.json({ ok: true, idle: "outside the Friday 3 PM Israel-time send window" });
  }

  await initZyDb();
  // getNextSendDate skips Fridays whose scheduled run is already logged, so
  // if it isn't today, today's email has been handled.
  const today = await getNextSendDate(now);
  if (today !== israelParts(now).date) {
    return Response.json({ ok: true, idle: "this week's scheduled email already ran" });
  }

  if (await isSendCancelled(today)) {
    await logEmail({ kind: "cancelled", sendDate: today, note: "Cancelled from the mailing list page" });
    return Response.json({ ok: true, skipped: "cancelled" });
  }

  const { parsha, essay } = await getWeeklyEssay(today);
  if (!essay) {
    await logEmail({
      kind: "skipped",
      sendDate: today,
      note: `No Dvar Torah uploaded for ${parsha ?? "this week"}`,
    });
    return Response.json({ ok: true, skipped: "no essay for this week", parsha });
  }
  if (essay.emailed_at) {
    await logEmail({
      kind: "skipped",
      essay,
      sendDate: today,
      note: "Already sent to the list manually",
    });
    return Response.json({ ok: true, skipped: "already sent", parsha });
  }

  const { sent, failed } = await sendEssayToList(essay, "scheduled", today);
  return Response.json({ ok: true, parsha, essay: essay.title, sent, failed });
}

export async function GET(req: Request) {
  try {
    return await run(req);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
