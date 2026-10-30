import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed } from "@/lib/zy-auth";
import { getArchiveParshiot, formatEssayDate } from "@/lib/content-zichronyonatan";
import { emailConfigured, getNextScheduled, type ZyEssayRow } from "@/lib/zy-email";
import TopBar from "../TopBar";
import ZyLogin from "../ZyLogin";
import AdminPanel from "./AdminPanel";

export const metadata = { title: "Mailing List | Zichron Yonatan" };

export default async function AdminPage() {
  if (!(await isZyAuthed())) {
    return (
      <>
        <TopBar />
        <main className="zy-main" id="zy-content">
          <ZyLogin heading="Mailing list" />
        </main>
      </>
    );
  }

  await initZyDb();
  const [subRows, essayRows, logRows, next] = await Promise.all([
    sql`SELECT email, name, created_at FROM zy_subscribers ORDER BY created_at DESC, email`,
    sql`SELECT * FROM zy_essays ORDER BY created_at DESC LIMIT 25`,
    sql`
      SELECT l.id, l.sent_at, l.kind, l.recipients, l.failures, l.failed_list, l.note, l.send_date,
             COALESCE(NULLIF(l.title, ''), e.title) AS title
      FROM zy_email_log l LEFT JOIN zy_essays e ON e.id = l.essay_id
      ORDER BY l.sent_at DESC LIMIT 60
    `,
    getNextScheduled(),
  ]);
  const subscribers = subRows as { email: string; name: string; created_at: string }[];
  const essays = essayRows as ZyEssayRow[];
  const log = logRows as {
    id: string;
    sent_at: string;
    kind: string;
    recipients: number;
    failures: number;
    failed_list: string;
    note: string;
    send_date: string | null;
    title: string | null;
  }[];

  const parshaNames = Object.fromEntries(getArchiveParshiot().map((p) => [p.slug, p.parsha]));
  const fmt = (d: string | Date) => formatEssayDate(new Date(d));
  const toEssay = (e: ZyEssayRow) => ({
    id: e.id,
    title: e.title,
    author: e.author,
    parsha: parshaNames[e.parsha_slug] || e.parsha_slug,
    parshaSlug: e.parsha_slug,
    uploaded: fmt(e.created_at),
    emailed: e.emailed_at ? fmt(e.emailed_at) : null,
  });

  return (
    <>
      <TopBar />
      <main className="zy-main" id="zy-content">
        <h1 className="zy-parsha-h1">Mailing list</h1>
        <span className="zy-parsha-book-tag">Zichron Yonatan weekly email</span>
        <AdminPanel
          emailReady={emailConfigured()}
          next={{
            sendDate: next.sendDate,
            label: next.label,
            parsha: next.parsha,
            cancelled: next.cancelled,
            essay: next.essay ? toEssay(next.essay) : null,
          }}
          subscribers={subscribers.map((s) => ({ email: s.email, name: s.name, added: fmt(s.created_at) }))}
          essays={essays.map(toEssay)}
          log={log.map((l) => ({
            id: l.id,
            when: new Date(l.sent_at).toLocaleString("en-US", {
              timeZone: "Asia/Jerusalem",
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            // Rows from before the log had a kind column.
            kind: l.kind || (l.note.startsWith("weekly") ? (l.recipients ? "scheduled" : "skipped") : "manual"),
            title: l.title,
            recipients: l.recipients,
            failures: l.failures,
            failedList: l.failed_list,
            note: l.note,
          }))}
        />
      </main>
    </>
  );
}
