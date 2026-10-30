"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cleanPastedHtml, plainTextToHtml } from "./clean-paste";
import { useStoredValue } from "./useStoredValue";

type Props = {
  parshaGroups: { book: string; parshiot: { slug: string; parsha: string }[] }[];
  authors: string[];
  defaultParsha: string;
  // When set, the form edits this uploaded dvar Torah instead of creating one.
  initial?: { id: string; title: string; author: string; parshaSlug: string; html: string };
  // Archive essays may be unsigned; new uploads always need an author.
  requireAuthor?: boolean;
};

const OTHER = "__other__";
const LAST_AUTHOR_KEY = "zy-last-author";

// Mirrors the weekly cron in vercel.json (Fridays 05:00 UTC).
function beforeWeeklySend() {
  const now = new Date();
  const day = now.getUTCDay();
  return day < 5 || (day === 5 && now.getUTCHours() < 5);
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export default function EssayForm({ parshaGroups, authors, defaultParsha, initial, requireAuthor = true }: Props) {
  const router = useRouter();
  const editing = !!initial;
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [parsha, setParsha] = useState(initial?.parshaSlug ?? defaultParsha);
  // New uploads default to whoever last uploaded from this browser; edits
  // start from the saved author (as free text if they're not in the list).
  const [storedAuthor, setStoredAuthor, rememberAuthor] = useStoredValue(LAST_AUTHOR_KEY);
  const [editAuthor, setEditAuthor] = useState(
    initial ? (authors.includes(initial.author) ? initial.author : OTHER) : ""
  );
  const rawAuthor = editing ? editAuthor : storedAuthor;
  const setAuthorChoice = editing ? setEditAuthor : setStoredAuthor;
  const authorChoice = rawAuthor === OTHER || authors.includes(rawAuthor) ? rawAuthor : "";
  const [otherAuthor, setOtherAuthor] = useState(
    initial && !authors.includes(initial.author) ? initial.author : ""
  );
  const [empty, setEmpty] = useState(!initial?.html);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState<{ url: string; title: string } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // The editor is uncontrolled (contentEditable), so seed it once.
  useEffect(() => {
    if (initial && editorRef.current) editorRef.current.innerHTML = initial.html;
  }, [initial]);

  const author = authorChoice === OTHER ? otherAuthor.trim() : authorChoice;

  function syncEmpty() {
    setEmpty(!editorRef.current?.textContent?.trim());
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const clean = html ? cleanPastedHtml(html) : plainTextToHtml(text);
    exec("insertHTML", clean);
    syncEmpty();
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Please add a title.");
    if (!parsha) return setError("Please choose a parsha or holiday.");
    if (!author && requireAuthor) return setError("Please choose an author.");
    if (empty) return setError("Paste or type the dvar Torah first.");

    setBusy(true);
    setSaved(null);
    const url = initial
      ? `/api/zichronyonatan/essays/${encodeURIComponent(initial.id)}`
      : "/api/zichronyonatan/essays";
    const res = await fetch(url, {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        author,
        parshaSlug: parsha,
        html: editorRef.current?.innerHTML || "",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(
        res.status === 401
          ? "Your session expired — reload the page and sign in again (copy your text first)."
          : data.error || "Something went wrong."
      );
      return;
    }
    if (editing) {
      setSaved(data.url);
      router.refresh();
      return;
    }
    if (authorChoice !== OTHER) rememberAuthor(authorChoice);
    setPublished({ url: data.url, title: title.trim() });
  }

  function reset() {
    setPublished(null);
    setTitle("");
    setEmpty(true);
    setParsha(defaultParsha);
  }

  if (published) {
    return (
      <div className="zy-panel zy-success">
        <span className="zy-featured-eyebrow">Published</span>
        <h2 className="zy-featured-title">{published.title}</h2>
        <p>
          It&apos;s live on the site now.
          {parsha === defaultParsha && beforeWeeklySend() &&
            " Since it's for this week, it will also go out to the mailing list on Friday morning."}
        </p>
        <div className="zy-actions">
          <Link href={published.url} className="zy-button">
            View it on the site
          </Link>
          <button type="button" className="zy-button zy-button-quiet" onClick={reset}>
            Upload another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="zy-upload-form" onSubmit={publish}>
      <label className="zy-field">
        <span>Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Zichron Yonatan — Parshas Lech Lecha 5787"
        />
      </label>

      <div className="zy-field-row">
        <label className="zy-field">
          <span>Parsha / holiday</span>
          <select value={parsha} onChange={(e) => setParsha(e.target.value)}>
            <option value="">Choose…</option>
            {parshaGroups.map((g) => (
              <optgroup key={g.book} label={g.book}>
                {g.parshiot.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.parsha}
                    {p.slug === defaultParsha ? " (this week)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="zy-field">
          <span>Author</span>
          <select value={authorChoice} onChange={(e) => setAuthorChoice(e.target.value)}>
            <option value="">Choose…</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value={OTHER}>Someone else…</option>
          </select>
        </label>
      </div>

      {authorChoice === OTHER && (
        <label className="zy-field">
          <span>Author name</span>
          <input
            type="text"
            value={otherAuthor}
            onChange={(e) => setOtherAuthor(e.target.value)}
            autoFocus={!editing}
          />
        </label>
      )}

      <div className="zy-field">
        <span id="zy-editor-label">Dvar Torah</span>
        <div className="zy-editor-wrap">
          <div className="zy-toolbar" role="toolbar" aria-label="Formatting">
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} title="Bold">
              <b>B</b>
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} title="Italic">
              <i>I</i>
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")} title="Underline">
              <u>U</u>
            </button>
            <span className="zy-toolbar-sep" />
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "h3")} title="Heading">
              H
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "blockquote")} title="Quote">
              &ldquo;&rdquo;
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "p")} title="Normal paragraph">
              ¶
            </button>
            <span className="zy-toolbar-sep" />
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} title="Bulleted list">
              •
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")} title="Numbered list">
              1.
            </button>
          </div>
          <div
            ref={editorRef}
            className={"zy-editor zy-essay-body" + (empty ? " zy-editor-empty" : "")}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-labelledby="zy-editor-label"
            data-placeholder="Paste the dvar Torah here…"
            onPaste={onPaste}
            onInput={syncEmpty}
          />
        </div>
      </div>

      {error && <p className="zy-form-error" role="alert">{error}</p>}
      {saved && (
        <p className="zy-notice" role="status">
          Saved &mdash; the site is updated. <Link href={saved}>View it</Link>
        </p>
      )}

      <div className="zy-actions">
        <button className="zy-button" disabled={busy}>
          {busy ? (editing ? "Saving…" : "Publishing…") : editing ? "Save changes" : "Publish"}
        </button>
      </div>
    </form>
  );
}
