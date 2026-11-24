"use client";

import { useState } from "react";
import type { BookSettings } from "@/lib/zy-book";

const LINES: { key: keyof BookSettings; label: string; hint?: string }[] = [
  { key: "title", label: "Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "credit", label: "Credit line", hint: "Shown at the bottom of the title page" },
  { key: "copyrightHolder", label: "Copyright holder" },
  { key: "copyrightYear", label: "Copyright year" },
  { key: "isbn", label: "ISBN", hint: "From KDP once you set up the book there" },
];

const TEXTS: { key: keyof BookSettings; label: string; rows: number }[] = [
  { key: "dedication", label: "Dedication", rows: 4 },
  { key: "introduction", label: "Introduction", rows: 10 },
];

/** The printed book's front matter: title page, copyright page, dedication, introduction. */
export default function BookSettingsForm({ initial }: { initial: BookSettings }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const set = (key: keyof BookSettings) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const res = await fetch("/api/zichronyonatan/book", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setNotice({ kind: "error", text: data.error || "Something went wrong." });
    setSaved(values);
    setNotice({ kind: "ok", text: "Saved. It'll be in the next book data download." });
  }

  return (
    <form onSubmit={save} className="zy-admin">
      <div className="zy-field-row">
        {LINES.map(({ key, label, hint }) => (
          <label key={key} className="zy-field">
            <span>{label}</span>
            <input value={values[key]} onChange={set(key)} maxLength={300} />
            {hint && <em className="zy-form-hint">{hint}</em>}
          </label>
        ))}
      </div>
      {TEXTS.map(({ key, label, rows }) => (
        <label key={key} className="zy-field">
          <span>{label}</span>
          <textarea value={values[key]} onChange={set(key)} rows={rows} />
        </label>
      ))}
      <p className="zy-form-hint">
        Leave a blank line between paragraphs. Put *asterisks* around words to italicize them.
      </p>
      {notice && (
        <p className={notice.kind === "ok" ? "zy-notice" : "zy-form-error"} role="status">
          {notice.text}
        </p>
      )}
      <div className="zy-actions">
        <button type="submit" className="zy-button" disabled={busy || !dirty}>
          {busy ? "Saving…" : "Save book details"}
        </button>
      </div>
    </form>
  );
}
