"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ParshaGroup } from "@/lib/zy-essays";

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
  emailed: string | null;
  words: number;
  excerpt: string;
};

type Show = "all" | "uploaded" | "archive" | "edited" | "hidden";
const PAGE = 30;

export default function ManageList({ essays, parshaGroups }: { essays: Essay[]; parshaGroups: ParshaGroup[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [parshaFilter, setParshaFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [show, setShow] = useState<Show>("all");
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const parshaName = useMemo(
    () => Object.fromEntries(parshaGroups.flatMap((g) => g.parshiot.map((p) => [p.slug, p.parsha]))),
    [parshaGroups]
  );
  const authors = useMemo(() => Array.from(new Set(essays.map((e) => e.author))).sort(), [essays]);
  const usedParshiot = useMemo(() => new Set(essays.map((e) => e.parshaSlug)), [essays]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return essays.filter(
      (e) =>
        (show === "all" ||
          (show === "uploaded" && e.uploaded) ||
          (show === "archive" && !e.uploaded) ||
          (show === "edited" && e.edited) ||
          (show === "hidden" && e.hidden)) &&
        (!parshaFilter || e.parshaSlug === parshaFilter) &&
        (!authorFilter || e.author === authorFilter) &&
        (!q || e.title.toLowerCase().includes(q) || e.excerpt.toLowerCase().includes(q))
    );
  }, [essays, query, parshaFilter, authorFilter, show]);
  const shown = filtered.slice(0, limit);

  // Changing a filter starts the list from the top again.
  function filterSetter<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setLimit(PAGE);
    };
  }

  async function request(key: string, url: string, method: string, body?: unknown) {
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
      return false;
    }
    router.refresh();
    return true;
  }

  const essayUrl = (e: Essay) => `/api/zichronyonatan/essays/${encodeURIComponent(e.id)}`;

  async function recategorize(e: Essay, slug: string) {
    if (slug === e.parshaSlug) return;
    if (await request(`move-${e.id}`, essayUrl(e), "PATCH", { parshaSlug: slug })) {
      setNotice({ kind: "ok", text: `“${e.title}” moved from ${e.parsha} to ${parshaName[slug]}.` });
    }
  }

  async function remove(e: Essay) {
    if (confirming !== e.id) return setConfirming(e.id);
    if (await request(`del-${e.id}`, essayUrl(e), "DELETE")) {
      setNotice({ kind: "ok", text: `“${e.title}” was deleted.` });
    }
  }

  async function setHidden(e: Essay, hidden: boolean) {
    if (hidden && confirming !== e.id) return setConfirming(e.id);
    if (await request(`hide-${e.id}`, essayUrl(e), "PATCH", { hidden })) {
      setNotice({
        kind: "ok",
        text: hidden ? `“${e.title}” is hidden from the site.` : `“${e.title}” is back on the site.`,
      });
    }
  }

  return (
    <div className="zy-admin">
      {notice && (
        <p className={notice.kind === "ok" ? "zy-notice" : "zy-form-error"} role="status">
          {notice.text}
        </p>
      )}

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
            {authors.map((a) => (
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
          </select>
        </label>
      </div>

      <p className="zy-form-hint">
        {filtered.length === essays.length
          ? `${essays.length} Divrei Torah`
          : `${filtered.length} of ${essays.length} Divrei Torah match`}
      </p>

      {filtered.length === 0 ? (
        <p className="zy-form-hint">No Divrei Torah match those filters.</p>
      ) : (
        <ul className="zy-manage-list">
          {shown.map((e) => (
            <li key={e.id} className={"zy-manage-item" + (e.hidden ? " zy-is-hidden" : "")}>
              <div className="zy-manage-head">
                <Link href={`/zichronyonatan/manage/${encodeURIComponent(e.id)}`} className="zy-manage-title">
                  {e.title}
                </Link>
                <span className="zy-list-sub">
                  {[e.author, e.date, `${e.words.toLocaleString()} words`, e.emailed && `emailed ${e.emailed}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="zy-tags">
                  <span className="zy-tag">{e.uploaded ? "Uploaded on the site" : "Family archive"}</span>
                  {e.edited && <span className="zy-tag zy-tag-gold">Edited</span>}
                  {e.hidden && <span className="zy-tag zy-tag-muted">Hidden from the site</span>}
                </span>
              </div>
              <p className="zy-manage-excerpt">
                {e.excerpt}
                {e.excerpt.length >= 220 ? "…" : ""}
              </p>
              <div className="zy-manage-controls">
                <label className="zy-inline-select">
                  <span>Filed under</span>
                  <select
                    value={e.parshaSlug}
                    disabled={!!busy}
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
                  <Link
                    href={`/zichronyonatan/manage/${encodeURIComponent(e.id)}`}
                    className="zy-button zy-button-small"
                  >
                    Edit
                  </Link>
                  {!e.hidden && (
                    <Link
                      href={`/zichronyonatan/parsha/${e.parshaSlug}`}
                      className="zy-button zy-button-quiet zy-button-small"
                    >
                      View
                    </Link>
                  )}
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
