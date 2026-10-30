import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed } from "@/lib/zy-auth";
import { getArchiveParshiot, formatEssayDate } from "@/lib/content-zichronyonatan";
import { emailConfigured, getWeeklyEssay, type ZyEssayRow } from "@/lib/zy-email";
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
  const [subRows, essayRows, logRows, weekly] = await Promise.all([
    sql`SELECT email, name, created_at FROM zy_subscribers ORDER BY created_at DESC, email`,
    sql`SELECT * FROM zy_essays ORDER BY created_at DESC LIMIT 25`,
    sql`
      SELECT l.sent_at, l.recipients, l.failures, l.note, e.title
      FROM zy_email_log l LEFT JOIN zy_essays e ON e.id = l.essay_id
      ORDER BY l.sent_at DESC LIMIT 12
    `,
    getWeeklyEssay(),
  ]);
  const subscribers = subRows as { email: string; name: string; created_at: string }[];
  const essays = essayRows as ZyEssayRow[];
  const log = logRows as {
    sent_at: string;
    recipients: number;
    failures: number;
    note: string;
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
          weekly={{
            parsha: weekly.parsha,
            essay: weekly.essay ? toEssay(weekly.essay) : null,
          }}
          subscribers={subscribers.map((s) => ({ email: s.email, name: s.name, added: fmt(s.created_at) }))}
          essays={essays.map(toEssay)}
          log={log.map((l) => ({
            when: new Date(l.sent_at).toLocaleString("en-US", {
              timeZone: "Asia/Jerusalem",
              dateStyle: "medium",
              timeStyle: "short",
            }),
            title: l.title,
            recipients: l.recipients,
            failures: l.failures,
            note: l.note,
          }))}
        />
      </main>
    </>
  );
}
