import Link from "next/link";
import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed } from "@/lib/zy-auth";
import { getAllEssays, getArchiveParshiot, formatEssayDate } from "@/lib/content-zichronyonatan";
import { emailConfigured, getNextScheduled, type ZyEssayRow } from "@/lib/zy-email";
import TopBar from "../TopBar";
import ZyLogin from "../ZyLogin";
import AdminPanel from "./AdminPanel";
import BookSettingsForm from "./BookSettingsForm";
import { getBookSettings } from "@/lib/zy-book";

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
    sql`SELECT * FROM zy_essays WHERE id NOT LIKE 'a~%' ORDER BY created_at DESC LIMIT 25`,
    sql`
      SELECT l.id, l.sent_at, l.kind, l.recipients, l.failures, l.failed_list, l.note, l.send_date,
             COALESCE(NULLIF(l.title, ''), e.title) AS title
      FROM zy_email_log l LEFT JOIN zy_essays e ON e.id = l.essay_id
      ORDER BY l.sent_at DESC LIMIT 60
    `,
    getNextScheduled(),
  ]);
  // Also triggers the one-time import of the old archive into the database.
  const allEssays = await getAllEssays({ includeHidden: true });
  const archiveCount = allEssays.filter((e) => !e.uploaded).length;
  const hiddenCount = allEssays.filter((e) => e.hidden).length;
  const bookCount = allEssays.filter((e) => e.inBook).length;
  const book = await getBookSettings();
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
    uploaded: e.date_label ?? fmt(e.created_at),
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
            republished: next.republished,
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
        <section className="zy-admin-section">
          <h2>Archive &amp; book</h2>
          <p className="zy-form-hint">
            {allEssays.length} Divrei Torah in the database: {archiveCount} from the original family
            archive, {allEssays.length - archiveCount} uploaded on the site
            {hiddenCount ? `, ${hiddenCount} hidden` : ""}.
          </p>
          <p className="zy-form-hint">
            <strong>{bookCount}</strong> selected for the book. Choose which ones on the{" "}
            <Link href="/zichronyonatan/manage">manage page</Link> (Add to book / Remove from book, or
            Show &ldquo;In the book&rdquo;). Edits you make to an essay there are used in the book too.
          </p>
          <p>
            <a className="zy-button" href="/api/zichronyonatan/export" download>
              Download book data
            </a>
          </p>
          <p className="zy-form-hint">
            Saves essays.json with the book details below and every Dvar Torah selected for the book,
            for building the PDF and Kindle files.
          </p>
        </section>
        <section className="zy-admin-section">
          <h2>Book details</h2>
          <p className="zy-form-hint">The title page, copyright page, dedication and introduction.</p>
          <BookSettingsForm initial={book} />
        </section>
      </main>
    </>
  );
}
