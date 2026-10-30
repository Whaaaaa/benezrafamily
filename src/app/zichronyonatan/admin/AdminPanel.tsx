"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStoredValue } from "../useStoredValue";

type EssayInfo = {
  id: string;
  title: string;
  author: string;
  parsha: string;
  parshaSlug: string;
  uploaded: string;
  emailed: string | null;
};

type LogEntry = {
  id: string;
  when: string;
  kind: string;
  title: string | null;
  recipients: number;
  failures: number;
  failedList: string;
  note: string;
};

type NextInfo = {
  sendDate: string;
  label: string;
  parsha: string | null;
  cancelled: boolean;
};

type Props = {
  emailReady: boolean;
  next: NextInfo & { essay: EssayInfo | null };
  subscribers: { email: string; name: string; added: string }[];
  essays: EssayInfo[];
  log: LogEntry[];
};

// Shown after a manual send, offering to cancel the next scheduled email.
type CancelPrompt = NextInfo & { essayTitle: string | null; sameAsSent: boolean };

const TEST_EMAIL_KEY = "zy-test-email";

const KIND_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  manual: "Manual",
  test: "Test",
  skipped: "Skipped",
  cancelled: "Cancelled",
};

export default function AdminPanel({ emailReady, next, subscribers, essays, log }: Props) {
  const router = useRouter();
  const [testEmail, setTestEmail, rememberTestEmail] = useStoredValue(TEST_EMAIL_KEY);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cancelPrompt, setCancelPrompt] = useState<CancelPrompt | null>(null);

  const [pasted, setPasted] = useState("");
  const [filter, setFilter] = useState("");

  async function call(key: string, url: string, method: string, body?: unknown) {
    setBusy(key);
    setNotice(null);
    setConfirming(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setNotice({ kind: "error", text: data.error || "Something went wrong." });
      return null;
    }
    router.refresh();
    return data;
  }

  async function sendTest(essay: EssayInfo) {
    rememberTestEmail(testEmail);
    const data = await call(`test-${essay.id}`, "/api/zichronyonatan/send", "POST", {
      essayId: essay.id,
      mode: "test",
      testEmail,
    });
    if (data) setNotice({ kind: "ok", text: `Test of “${essay.title}” sent to ${testEmail}.` });
  }

  async function sendList(essay: EssayInfo) {
    if (confirming !== `list-${essay.id}`) return setConfirming(`list-${essay.id}`);
    const data = await call(`list-${essay.id}`, "/api/zichronyonatan/send", "POST", {
      essayId: essay.id,
      mode: "list",
    });
    if (data) {
      const failed = data.failed?.length ? ` ${data.failed.length} failed: ${data.failed.join(", ")}` : "";
      setNotice({ kind: failed ? "error" : "ok", text: `“${essay.title}” sent to ${data.sent} subscribers.${failed}` });
      if (data.next && !data.next.cancelled) setCancelPrompt(data.next);
    }
  }

  async function setScheduledCancelled(sendDate: string, cancelled: boolean) {
    const data = await call(`sched-${sendDate}`, "/api/zichronyonatan/schedule", "POST", { sendDate, cancelled });
    setCancelPrompt(null);
    if (data) {
      setNotice({
        kind: "ok",
        text: cancelled
          ? "The next scheduled email is cancelled. You can restore it from the top of this page."
          : "The next scheduled email is back on.",
      });
    }
  }

  async function deleteEssay(essay: EssayInfo) {
    if (confirming !== `del-${essay.id}`) return setConfirming(`del-${essay.id}`);
    const data = await call(`del-${essay.id}`, `/api/zichronyonatan/essays/${essay.id}`, "DELETE");
    if (data) setNotice({ kind: "ok", text: `“${essay.title}” was removed from the site.` });
  }

  async function addSubscribers(e: React.FormEvent) {
    e.preventDefault();
    const data = await call("add", "/api/zichronyonatan/subscribers", "POST", { text: pasted });
    if (!data) return;
    const parts = [`Added ${data.added} new subscriber${data.added === 1 ? "" : "s"}.`];
    if (data.existing) parts.push(`${data.existing} already on the list.`);
    if (data.unreadable?.length) parts.push(`Couldn't find an email address in: ${data.unreadable.join(" | ")}`);
    setNotice({ kind: data.unreadable?.length ? "error" : "ok", text: parts.join(" ") });
    if (!data.unreadable?.length) setPasted("");
  }

  async function removeSubscriber(email: string) {
    if (confirming !== `rm-${email}`) return setConfirming(`rm-${email}`);
    const data = await call(`rm-${email}`, "/api/zichronyonatan/subscribers", "DELETE", { email });
    if (data) setNotice({ kind: "ok", text: `${email} removed.` });
  }

  async function signOut() {
    await fetch("/api/zichronyonatan/auth", { method: "DELETE" });
    router.refresh();
  }

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q
      ? subscribers.filter((s) => s.email.includes(q) || s.name.toLowerCase().includes(q))
      : subscribers;
  }, [filter, subscribers]);

  function essayActions(essay: EssayInfo) {
    return (
      <div className="zy-actions zy-actions-tight">
        <button
          type="button"
          className="zy-button zy-button-quiet zy-button-small"
          disabled={!!busy || !emailReady || !testEmail.includes("@")}
          onClick={() => sendTest(essay)}
          title={testEmail ? `Send a test to ${testEmail}` : "Enter a test address above"}
        >
          {busy === `test-${essay.id}` ? "Sending…" : "Send test"}
        </button>
        <button
          type="button"
          className={"zy-button zy-button-small" + (confirming === `list-${essay.id}` ? " zy-button-warn" : "")}
          disabled={!!busy || !emailReady || subscribers.length === 0}
          onClick={() => sendList(essay)}
        >
          {busy === `list-${essay.id}`
            ? "Sending…"
            : confirming === `list-${essay.id}`
              ? `Send to all ${subscribers.length}?`
              : "Send to list now"}
        </button>
      </div>
    );
  }

  return (
    <div className="zy-admin">
      {notice && (
        <p className={notice.kind === "ok" ? "zy-notice" : "zy-form-error"} role="status">
          {notice.text}
        </p>
      )}

      {!emailReady && (
        <p className="zy-form-error">
          Email sending isn&apos;t set up yet: add <code>SMTP_USER</code> and <code>SMTP_PASS</code> to the
          site&apos;s environment variables.
        </p>
      )}

      {cancelPrompt && (
        <div className="zy-modal-backdrop">
        <div className="zy-panel zy-prompt" role="alertdialog" aria-modal="true" aria-labelledby="zy-prompt-title">
          <h2 id="zy-prompt-title">Cancel the next scheduled email?</h2>
          {cancelPrompt.sameAsSent ? (
            <p>
              The scheduled email on {cancelPrompt.label} would have sent this same Dvar Torah. Since it&apos;s
              already gone out, it won&apos;t be sent twice; cancelling just means nothing goes out that day.
            </p>
          ) : (
            <p>
              The next scheduled email goes out {cancelPrompt.label}
              {cancelPrompt.essayTitle
                ? ` with “${cancelPrompt.essayTitle}” (${cancelPrompt.parsha}).`
                : `, with whatever is uploaded for ${cancelPrompt.parsha || "that week"} by then (nothing yet).`}
            </p>
          )}
          <div className="zy-actions">
            <button
              type="button"
              className="zy-button"
              disabled={!!busy}
              onClick={() => setScheduledCancelled(cancelPrompt.sendDate, true)}
            >
              Yes, cancel it
            </button>
            <button type="button" className="zy-button zy-button-quiet" onClick={() => setCancelPrompt(null)}>
              No, keep it
            </button>
          </div>
        </div>
        </div>
      )}

      <section className={"zy-featured" + (next.cancelled ? " zy-is-cancelled" : "")}>
        <span className="zy-featured-eyebrow">Next scheduled email &middot; {next.label}</span>
        <h2 className="zy-featured-title">{next.parsha || "No parsha page that week"}</h2>
        {next.cancelled ? (
          <p className="zy-form-hint">
            <strong>Cancelled</strong> &mdash; nothing will go out on {next.label}.
          </p>
        ) : next.essay ? (
          <>
            <p className="zy-admin-line">
              <strong>{next.essay.title}</strong> &middot; {next.essay.author} &middot; uploaded{" "}
              {next.essay.uploaded}
            </p>
            <p className="zy-form-hint">
              {next.essay.emailed
                ? `Already sent to the list on ${next.essay.emailed}, so the scheduled email won't send it again.`
                : `Goes out automatically to ${subscribers.length} subscriber${subscribers.length === 1 ? "" : "s"}.`}
            </p>
          </>
        ) : (
          <p className="zy-form-hint">
            Nothing has been uploaded for {next.parsha || "that week"} yet, so nothing will be sent unless one is.{" "}
            <Link href="/zichronyonatan/upload">Upload a Dvar Torah</Link>
          </p>
        )}
        <div className="zy-actions">
          {next.essay && !next.cancelled && essayActions(next.essay)}
          <button
            type="button"
            className="zy-link-button"
            disabled={!!busy}
            onClick={() => setScheduledCancelled(next.sendDate, !next.cancelled)}
          >
            {next.cancelled ? "Restore this scheduled email" : "Cancel this scheduled email"}
          </button>
        </div>
        <label className="zy-field zy-test-field">
          <span>Send tests to</span>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
      </section>

      <section className="zy-admin-section">
        <h2 className="zy-book-heading">
          Subscribers <span className="zy-book-index">{subscribers.length}</span>
        </h2>
        <form onSubmit={addSubscribers} className="zy-panel">
          <label className="zy-field">
            <span>Add people</span>
            <textarea
              rows={5}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={"Paste addresses — one per line, comma-separated, or copied from Gmail / a spreadsheet:\nsarah@example.com\nDavid Levi <david@example.com>"}
            />
          </label>
          <button className="zy-button" disabled={!!busy || !pasted.trim()}>
            {busy === "add" ? "Adding…" : "Add to list"}
          </button>
        </form>

        {subscribers.length > 0 && (
          <>
            {subscribers.length > 8 && (
              <input
                className="zy-filter"
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search subscribers"
                aria-label="Search subscribers"
              />
            )}
            <ul className="zy-list">
              {shown.map((s) => (
                <li key={s.email}>
                  <div>
                    <span className="zy-list-main">{s.name || s.email}</span>
                    {s.name && <span className="zy-list-sub">{s.email}</span>}
                  </div>
                  <span className="zy-list-sub zy-list-date">added {s.added}</span>
                  <button
                    type="button"
                    className={"zy-link-button" + (confirming === `rm-${s.email}` ? " zy-warn" : "")}
                    disabled={!!busy}
                    onClick={() => removeSubscriber(s.email)}
                  >
                    {confirming === `rm-${s.email}` ? "Confirm remove" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="zy-admin-section">
        <h2 className="zy-book-heading">
          Uploaded Divrei Torah
          <Link href="/zichronyonatan/manage" className="zy-heading-link">
            Manage all &rarr;
          </Link>
        </h2>
        {essays.length === 0 ? (
          <p className="zy-form-hint">
            None yet. <Link href="/zichronyonatan/upload">Upload the first one</Link>
          </p>
        ) : (
          <ul className="zy-list zy-list-essays">
            {essays.map((e) => (
              <li key={e.id}>
                <div>
                  <Link href={`/zichronyonatan/parsha/${e.parshaSlug}`} className="zy-list-main">
                    {e.title}
                  </Link>
                  <span className="zy-list-sub">
                    {e.parsha} &middot; {e.author} &middot; uploaded {e.uploaded}
                    {e.emailed ? ` · emailed ${e.emailed}` : ""}
                  </span>
                </div>
                <div className="zy-actions zy-actions-tight">
                  {essayActions(e)}
                  <Link href={`/zichronyonatan/manage/${e.id}`} className="zy-link-button">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className={"zy-link-button" + (confirming === `del-${e.id}` ? " zy-warn" : "")}
                    disabled={!!busy}
                    onClick={() => deleteEssay(e)}
                  >
                    {confirming === `del-${e.id}` ? "Confirm delete" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="zy-admin-section">
        <h2 className="zy-book-heading">Email log</h2>
        <p className="zy-form-hint">
          {"Every email sent from the site. "}
          <strong>Scheduled</strong>
          {" went out automatically on Friday at 3 PM; "}
          <strong>Manual</strong>
          {" was sent with “Send to list now”. Times are Israel time."}
        </p>
        {log.length === 0 ? (
          <p className="zy-form-hint">Nothing has been sent yet.</p>
        ) : (
          <div className="zy-table-wrap">
            <table className="zy-log-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Dvar Torah</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id} className={`zy-log-${l.kind}`}>
                    <td className="zy-log-when">{l.when}</td>
                    <td>
                      <span className={`zy-kind zy-kind-${l.kind}`}>{KIND_LABEL[l.kind] || l.kind}</span>
                    </td>
                    <td>{l.title || <span className="zy-list-sub">&mdash;</span>}</td>
                    <td>
                      {l.kind === "scheduled" || l.kind === "manual" ? (
                        <>
                          Sent to {l.recipients} subscriber{l.recipients === 1 ? "" : "s"}
                          {l.failures > 0 && (
                            <span className="zy-log-failed" title={l.failedList}>
                              {" "}
                              &middot; {l.failures} failed
                            </span>
                          )}
                        </>
                      ) : l.kind === "test" ? (
                        <>
                          {l.note}
                          {l.failures > 0 && <span className="zy-log-failed"> &middot; failed</span>}
                        </>
                      ) : (
                        <span className="zy-list-sub">{l.note}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="zy-signout">
        <button type="button" className="zy-link-button" onClick={signOut}>
          Sign out
        </button>
      </p>
    </div>
  );
}
