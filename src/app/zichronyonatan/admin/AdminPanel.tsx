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

type Props = {
  emailReady: boolean;
  weekly: { parsha: string | null; essay: EssayInfo | null };
  subscribers: { email: string; name: string; added: string }[];
  essays: EssayInfo[];
  log: { when: string; title: string | null; recipients: number; failures: number; note: string }[];
};

const TEST_EMAIL_KEY = "zy-test-email";

export default function AdminPanel({ emailReady, weekly, subscribers, essays, log }: Props) {
  const router = useRouter();
  const [testEmail, setTestEmail, rememberTestEmail] = useStoredValue(TEST_EMAIL_KEY);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

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

      <section className="zy-featured">
        <span className="zy-featured-eyebrow">This Friday&apos;s email</span>
        <h2 className="zy-featured-title">{weekly.parsha || "No parsha page this week"}</h2>
        {weekly.essay ? (
          <>
            <p className="zy-admin-line">
              <strong>{weekly.essay.title}</strong> &middot; {weekly.essay.author} &middot; uploaded{" "}
              {weekly.essay.uploaded}
            </p>
            <p className="zy-form-hint">
              {weekly.essay.emailed
                ? `Already sent to the list on ${weekly.essay.emailed} — the Friday email won't send it again.`
                : `Goes out automatically Friday morning to ${subscribers.length} subscriber${subscribers.length === 1 ? "" : "s"}.`}
            </p>
            {essayActions(weekly.essay)}
          </>
        ) : (
          <p className="zy-form-hint">
            Nothing has been uploaded for {weekly.parsha || "this week"} yet, so nothing will be sent.{" "}
            <Link href="/zichronyonatan/upload">Upload a dvar Torah</Link>
          </p>
        )}
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
        <h2 className="zy-book-heading">Uploaded divrei Torah</h2>
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

      {log.length > 0 && (
        <section className="zy-admin-section">
          <h2 className="zy-book-heading">Send history</h2>
          <ul className="zy-list">
            {log.map((l, i) => (
              <li key={i}>
                <div>
                  <span className="zy-list-main">{l.title || l.note}</span>
                  <span className="zy-list-sub">
                    {l.title
                      ? `${l.note} · ${l.recipients} sent${l.failures ? ` · ${l.failures} failed` : ""}`
                      : ""}
                  </span>
                </div>
                <span className="zy-list-sub zy-list-date">{l.when}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="zy-signout">
        <button type="button" className="zy-link-button" onClick={signOut}>
          Sign out
        </button>
      </p>
    </div>
  );
}
