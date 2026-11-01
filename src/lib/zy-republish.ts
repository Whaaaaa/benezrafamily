import sql from "@/lib/db";
import { archiveBodyToHtml, getAllEssays, getManagedEssay, type Essay } from "@/lib/content-zichronyonatan";

// When nothing new is uploaded for a Shabbat, the weekly email re-sends a
// Dvar Torah from that parsha -- but only ones marked "Republish" on the
// manage page. Each one sent goes to the back of its parsha's queue.

export type RepublishState = { markedAt: string; lastSentAt: string | null };

type Row = { essay_id: string; marked_at: string | Date; last_sent_at: string | Date | null };

const iso = (d: string | Date) => new Date(d).toISOString();

export async function getRepublishMap(): Promise<Map<string, RepublishState>> {
  if (!process.env.DATABASE_URL) return new Map();
  try {
    const rows = (await sql`SELECT essay_id, marked_at, last_sent_at FROM zy_republish`) as Row[];
    return new Map(
      rows.map((r) => [
        r.essay_id,
        { markedAt: iso(r.marked_at), lastSentAt: r.last_sent_at ? iso(r.last_sent_at) : null },
      ])
    );
  } catch {
    return new Map(); // table not created yet: nothing is marked
  }
}

export async function setRepublish(essayId: string, on: boolean) {
  if (on) {
    await sql`INSERT INTO zy_republish (essay_id) VALUES (${essayId}) ON CONFLICT DO NOTHING`;
  } else {
    await sql`DELETE FROM zy_republish WHERE essay_id = ${essayId}`;
  }
}

/** Records a send, moving the essay to the back of its parsha's queue. No-op if it isn't marked. */
export async function markRepublishSent(essayId: string) {
  await sql`UPDATE zy_republish SET last_sent_at = NOW() WHERE essay_id = ${essayId}`;
}

/**
 * The front of a parsha's republish queue: marked essays that are still on
 * the site, never-sent first, then the one sent longest ago (ties go to the
 * one marked first).
 */
export async function getRepublishPick(parshaSlug: string): Promise<Essay | undefined> {
  const marked = await getRepublishMap();
  if (marked.size === 0) return undefined;
  const time = (s: string | null) => (s ? Date.parse(s) : -Infinity);
  return (await getAllEssays())
    .filter((e) => e.parshaSlug === parshaSlug && !e.placeholder && marked.has(e.id))
    .sort((a, b) => {
      const ma = marked.get(a.id)!;
      const mb = marked.get(b.id)!;
      return time(ma.lastSentAt) - time(mb.lastSentAt) || Date.parse(ma.markedAt) - Date.parse(mb.markedAt);
    })[0];
}

/** Shapes any essay (upload or archive) like a zy_essays row for the email builder. */
export function essayToEmailRow(e: Essay) {
  return {
    id: e.id,
    parsha_slug: e.parshaSlug,
    title: e.title,
    author: e.author,
    body_html: e.html ?? archiveBodyToHtml(e.body),
    created_at: e.createdAt ?? new Date(0).toISOString(),
    emailed_at: e.emailedAt ?? null,
    // Archive essays carry a free-text date rather than an upload time.
    date_label: e.date,
  };
}

/** Any essay by id, ready to email. */
export async function getEmailEssay(id: string) {
  const e = await getManagedEssay(id);
  return e && !e.placeholder ? essayToEmailRow(e) : undefined;
}
