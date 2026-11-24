"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ParshaGroup } from "@/lib/zy-essays";
import EssayForm, { type SavedEssay } from "../EssayForm";

type Essay = {
  id: string;
  title: string;
  author: string;
  parshaSlug: string;
  parsha: string;
  date: string;
  uploaded: boolean;
  edited: boolean;
  hidden: boolean;
  inBook: boolean;
  emailed: string | null;
  republish: boolean;
  republished: string | null;
  words: number;
  excerpt: string;
};

type Show = "all" | "uploaded" | "archive" | "edited" | "hidden" | "republish" | "book" | "notbook";
const SHOWS: Show[] = ["all", "uploaded", "archive", "edited", "hidden", "republish", "book", "notbook"];
type Filters = { q: string; parsha: string; author: string; show: string };
type Notice = { kind: "ok" | "error"; text: string };

const PAGE = 30;
const EXCERPT = 220;

// Mirrors displayAuthor() on the server: sourcing notes collapse to "Unsigned".
const shownAuthor = (a: string) => a.replace(/^(Unsigned)\s*\(.*\)$/, "$1") || "Unsigned";

function textOf(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

type Props = {
  essays: Essay[];
  parshaGroups: ParshaGroup[];
  authors: string[];
  defaultParsha: string;
  initialFilters: Filters;
};

export default function ManageList({ essays: initialEssays, parshaGroups, authors, defaultParsha, initialFilters }: Props) {
  // The list is kept here and updated in place after each change, so
  // nothing reloads and the filters and scroll position stay put.
  const [essays, setEssays] = useState(initialEssays);
  const [query, setQuery] = useState(initialFilters.q);
  const [parshaFilter, setParshaFilter] = useState(initialFilters.parsha);
  const [authorFilter, setAuthorFilter] = useState(initialFilters.author);
  const [show, setShow] = useState<Show>(
    SHOWS.includes(initialFilters.show as Show) ? (initialFilters.show as Show) : "all"
  );
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, Notice>>({});
  // Essays changed since the filters were last touched stay visible even if
  // they no longer match (e.g. "Remove from book" while showing "In the book").
  const [pinned, setPinned] = useState<Set<string>>(new Set());

  // Keep the filters in the address bar, so a reload or the back button
  // brings them back. replaceState doesn't trigger a server round trip.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (parshaFilter) params.set("parsha", parshaFilter);
    if (authorFilter) params.set("author", authorFilter);
    if (show !== "all") params.set("show", show);
    const qs = params.toString();
    window.history.replaceState(window.history.state, "", qs ? `?${qs}` : window.location.pathname);
  }, [query, parshaFilter, authorFilter, show]);

  const parshaName = useMemo(
    () => Object.fromEntries(parshaGroups.flatMap((g) => g.parshiot.map((p) => [p.slug, p.parsha]))),
    [parshaGroups]
  );
  const authorOptions = useMemo(() => Array.from(new Set(essays.map((e) => e.author))).sort(), [essays]);
  const usedParshiot = useMemo(() => new Set(essays.map((e) => e.parshaSlug)), [essays]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return essays.filter(
      (e) =>
        pinned.has(e.id) ||
        ((show === "all" ||
          (show === "uploaded" && e.uploaded) ||
          (show === "archive" && !e.uploaded) ||
          (show === "edited" && e.edited) ||
          (show === "hidden" && e.hidden) ||
          (show === "republish" && e.republish) ||
          (show === "book" && e.inBook) ||
          (show === "notbook" && !e.inBook)) &&
          (!parshaFilter || e.parshaSlug === parshaFilter) &&
          (!authorFilter || e.author === authorFilter) &&
          (!q || e.title.toLowerCase().includes(q) || e.excerpt.toLowerCase().includes(q)))
    );
  }, [essays, query, parshaFilter, authorFilter, show, pinned]);
  const shown = filtered.slice(0, limit);

  const counts = useMemo(
    () => ({
      uploaded: essays.filter((e) => e.uploaded).length,
      book: essays.filter((e) => e.inBook).length,
      hidden: essays.filter((e) => e.hidden).length,
    }),
    [essays]
  );

  // Changing a filter starts the list from the top again and drops pins.
  function filterSetter<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setLimit(PAGE);
      setPinned(new Set());
    };
  }

  function clearFilters() {
    setQuery("");
    setParshaFilter("");
    setAuthorFilter("");
    setShow("all");
    setLimit(PAGE);
    setPinned(new Set());
  }

  const update = (id: string, patch: Partial<Essay>) =>
    setEssays((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const notify = (id: string, notice: Notice | null) =>
    setNotices((n) => {
      const next = { ...n };
      if (notice) next[id] = notice;
      else delete next[id];
      return next;
    });
  const pin = (id: string) => setPinned((p) => new Set(p).add(id));

  async function request(e: Essay, key: string, method: string, body?: unknown) {
    setBusy(`${key}-${e.id}`);
    setConfirming(null);
    notify(e.id, null);
    const res = await fetch(`/api/zichronyonatan/essays/${encodeURIComponent(e.id)}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      notify(e.id, {
        kind: "error",
        text: res.status === 401 ? "Your session expired. Reload the page and sign in again." : data.error || "Something went wrong.",
      });
      return null;
    }
    pin(e.id);
    return data;
  }

  async function recategorize(e: Essay, slug: string) {
    if (slug === e.parshaSlug) return;
    const data = await request(e, "move", "PATCH", { parshaSlug: slug });
    if (!data) return;
    update(e.id, { parshaSlug: slug, parsha: parshaName[slug], edited: !!data.essay?.edited });
    notify(e.id, { kind: "ok", text: `Moved from ${e.parsha} to ${parshaName[slug]}.` });
  }

  async function remove(e: Essay) {
    if (confirming !== e.id) return setConfirming(e.id);
    if (!(await request(e, "del", "DELETE"))) return;
    setEssays((list) => list.filter((x) => x.id !== e.id));
  }

  async function setHidden(e: Essay, hidden: boolean) {
    if (hidden && confirming !== e.id) return setConfirming(e.id);
    if (!(await request(e, "hide", "PATCH", { hidden }))) return;
    update(e.id, { hidden });
    notify(e.id, { kind: "ok", text: hidden ? "Hidden from the site." : "Back on the site." });
  }

  async function setRepublish(e: Essay, republish: boolean) {
    if (!(await request(e, "rep", "PATCH", { republish }))) return;
    update(e.id, { republish, republished: republish ? e.republished : null });
    notify(e.id, {
      kind: "ok",
      text: republish
        ? `The weekly email can re-send this when nothing new is uploaded for ${e.parsha}.`
        : "Won't be re-sent by the weekly email.",
    });
  }

  async function setInBook(e: Essay, inBook: boolean) {
    if (!(await request(e, "book", "PATCH", { inBook }))) return;
    update(e.id, { inBook });
    notify(e.id, { kind: "ok", text: inBook ? "Added to the book." : "Left out of the book." });
  }

  function onSaved(e: Essay, saved: SavedEssay) {
    const text = textOf(saved.html);
    update(e.id, {
      title: saved.title,
      author: shownAuthor(saved.author),
      parshaSlug: saved.parshaSlug,
      parsha: parshaName[saved.parshaSlug] || saved.parshaSlug,
      edited: saved.edited,
      words: text.split(" ").filter(Boolean).length,
      excerpt: text.slice(0, EXCERPT),
    });
    pin(e.id);
    setEditing(null);
    notify(e.id, { kind: "ok", text: "Saved. The site is updated." });
  }

  const filtering = !!(query || parshaFilter || authorFilter || show !== "all");

  return (
    <div className="zy-admin">
      <div className="zy-field-row zy-manage-filters">
        <label className="zy-field">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => filterSetter(setQuery)(e.target.value)}
            placeholder="Title or text"
          />
        </label>
        <label className="zy-field">
          <span>Parsha / holiday</span>
          <select value={parshaFilter} onChange={(e) => filterSetter(setParshaFilter)(e.target.value)}>
            <option value="">All</option>
            {parshaGroups.map((g) => {
              const used = g.parshiot.filter((p) => usedParshiot.has(p.slug));
              return used.length ? (
                <optgroup key={g.book} label={g.book}>
                  {used.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.parsha}
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </select>
        </label>
        <label className="zy-field">
          <span>Author</span>
          <select value={authorFilter} onChange={(e) => filterSetter(setAuthorFilter)(e.target.value)}>
            <option value="">All</option>
            {authorOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="zy-field">
          <span>Show</span>
          <select value={show} onChange={(e) => filterSetter(setShow)(e.target.value as Show)}>
            <option value="all">Everything</option>
            <option value="uploaded">Uploaded on the site</option>
            <option value="archive">Family archive</option>
            <option value="edited">Edited on the site</option>
            <option value="hidden">Hidden</option>
            <option value="republish">Marked to republish</option>
            <option value="book">In the book</option>
            <option value="notbook">Not in the book</option>
          </select>
        </label>
      </div>

      <p className="zy-form-hint">
        {filtering ? `${filtered.length} of ${essays.length} match` : `${essays.length} Divrei Torah`} &middot;{" "}
        {counts.uploaded} uploaded on the site &middot; {counts.book} in the book
        {counts.hidden ? ` · ${counts.hidden} hidden` : ""}
        {filtering && (
          <>
            {" "}
            &middot;{" "}
            <button type="button" className="zy-link-button" onClick={clearFilters}>
              Clear filters
            </button>
          </>
        )}
      </p>

      {filtered.length === 0 ? (
        <p className="zy-form-hint">No Divrei Torah match those filters.</p>
      ) : (
        <ul className="zy-manage-list">
          {shown.map((e) => (
            <li key={e.id} className={"zy-manage-item" + (e.hidden ? " zy-is-hidden" : "")}>
              <div className="zy-manage-head">
                <button
                  type="button"
                  className="zy-link-button zy-manage-title"
                  onClick={() => setEditing(editing === e.id ? null : e.id)}
                  aria-expanded={editing === e.id}
                >
                  {e.title}
                </button>
                <span className="zy-list-sub">
                  {[e.author, e.parsha, e.date, `${e.words.toLocaleString()} words`, e.emailed && `emailed ${e.emailed}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="zy-tags">
                  <span className="zy-tag">{e.uploaded ? "Uploaded on the site" : "Family archive"}</span>
                  {e.edited && <span className="zy-tag zy-tag-gold">Edited</span>}
                  {e.hidden && <span className="zy-tag zy-tag-muted">Hidden from the site</span>}
                  {e.inBook ? (
                    <span className="zy-tag zy-tag-gold">In the book</span>
                  ) : (
                    <span className="zy-tag zy-tag-muted">Not in the book</span>
                  )}
                  {e.republish && (
                    <span className="zy-tag zy-tag-sage">
                      Republish{e.republished ? ` · last re-sent ${e.republished}` : ""}
                    </span>
                  )}
                </span>
              </div>

              {editing === e.id ? (
                <InlineEditor
                  essay={e}
                  parshaGroups={parshaGroups}
                  authors={authors}
                  defaultParsha={defaultParsha}
                  onSaved={(saved) => onSaved(e, saved)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <p className="zy-manage-excerpt">
                  {e.excerpt}
                  {e.excerpt.length >= EXCERPT ? "…" : ""}
                </p>
              )}

              {notices[e.id] && (
                <p className={notices[e.id].kind === "ok" ? "zy-notice" : "zy-form-error"} role="status">
                  {notices[e.id].text}
                </p>
              )}

              <div className="zy-manage-controls">
                <label className="zy-inline-select">
                  <span>Filed under</span>
                  <select
                    value={e.parshaSlug}
                    disabled={!!busy || editing === e.id}
                    onChange={(ev) => recategorize(e, ev.target.value)}
                    aria-label={`Parsha for ${e.title}`}
                  >
                    {parshaGroups.map((g) => (
                      <optgroup key={g.book} label={g.book}>
                        {g.parshiot.map((p) => (
                          <option key={p.slug} value={p.slug}>
                            {p.parsha}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {busy === `move-${e.id}` && <em className="zy-list-sub">Saving…</em>}
                </label>
                <div className="zy-actions zy-actions-tight">
                  <button
                    type="button"
                    className="zy-button zy-button-small"
                    onClick={() => setEditing(editing === e.id ? null : e.id)}
                  >
                    {editing === e.id ? "Close editor" : "Edit"}
                  </button>
                  {!e.hidden && (
                    <Link
                      href={`/zichronyonatan/parsha/${e.parshaSlug}`}
                      className="zy-button zy-button-quiet zy-button-small"
                      target="_blank"
                    >
                      View
                    </Link>
                  )}
                  <button
                    type="button"
                    className="zy-link-button"
                    disabled={!!busy}
                    onClick={() => setInBook(e, !e.inBook)}
                    title="Whether this goes in the printed book"
                  >
                    {busy === `book-${e.id}` ? "Saving…" : e.inBook ? "Remove from book" : "Add to book"}
                  </button>
                  <button
                    type="button"
                    className="zy-link-button"
                    disabled={!!busy}
                    onClick={() => setRepublish(e, !e.republish)}
                    title="Lets the weekly email re-send this when nothing new is uploaded for its parsha"
                  >
                    {busy === `rep-${e.id}` ? "Saving…" : e.republish ? "Don't republish" : "Republish"}
                  </button>
                  {e.uploaded ? (
                    <button
                      type="button"
                      className={"zy-link-button" + (confirming === e.id ? " zy-warn" : "")}
                      disabled={!!busy}
                      onClick={() => remove(e)}
                    >
                      {busy === `del-${e.id}` ? "Deleting…" : confirming === e.id ? "Confirm delete" : "Delete"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={"zy-link-button" + (confirming === e.id ? " zy-warn" : "")}
                      disabled={!!busy}
                      onClick={() => setHidden(e, !e.hidden)}
                    >
                      {busy === `hide-${e.id}`
                        ? "Saving…"
                        : e.hidden
                          ? "Restore to site"
                          : confirming === e.id
                            ? "Confirm hide"
                            : "Hide"}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > limit && (
        <div className="zy-show-more">
          <button type="button" className="zy-button zy-button-quiet" onClick={() => setLimit(limit + PAGE)}>
            Show more ({filtered.length - limit} left)
          </button>
        </div>
      )}
    </div>
  );
}

type Loaded = { id: string; title: string; author: string; parshaSlug: string; html: string };

/** The full editor, opened inside an essay's row; loads the essay's text on open. */
function InlineEditor({
  essay,
  parshaGroups,
  authors,
  defaultParsha,
  onSaved,
  onCancel,
}: {
  essay: Essay;
  parshaGroups: ParshaGroup[];
  authors: string[];
  defaultParsha: string;
  onSaved: (saved: SavedEssay) => void;
  onCancel: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch(`/api/zichronyonatan/essays/${encodeURIComponent(essay.id)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!live) return;
        if (!res.ok) setError(res.status === 401 ? "Your session expired. Reload the page and sign in again." : data.error || "Couldn't load it.");
        else setLoaded(data);
      })
      .catch(() => live && setError("Couldn't load it. Check your connection."));
    return () => {
      live = false;
    };
  }, [essay.id]);

  if (error) return <p className="zy-form-error">{error}</p>;
  if (!loaded) return <p className="zy-form-hint">Loading…</p>;

  return (
    <div className="zy-inline-editor">
      <EssayForm
        parshaGroups={parshaGroups}
        authors={authors}
        defaultParsha={defaultParsha}
        requireAuthor={essay.uploaded}
        initial={loaded}
        onSaved={onSaved}
        onCancel={onCancel}
      />
      {!essay.uploaded && essay.edited && (
        <p className="zy-form-hint">
          To undo every change and go back to the archive original, use{" "}
          <Link href={`/zichronyonatan/manage/${encodeURIComponent(essay.id)}`}>Revert on the full edit page</Link>.
        </p>
      )}
    </div>
  );
}
