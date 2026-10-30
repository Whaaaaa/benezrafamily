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
  uploaded: string;
  emailed: string | null;
  words: number;
  excerpt: string;
};

export default function ManageList({ essays, parshaGroups }: { essays: Essay[]; parshaGroups: ParshaGroup[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [parshaFilter, setParshaFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const parshaName = useMemo(
    () => Object.fromEntries(parshaGroups.flatMap((g) => g.parshiot.map((p) => [p.slug, p.parsha]))),
    [parshaGroups]
  );
  const authors = useMemo(() => Array.from(new Set(essays.map((e) => e.author))).sort(), [essays]);
  const usedParshiot = useMemo(() => new Set(essays.map((e) => e.parshaSlug)), [essays]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return essays.filter(
      (e) =>
        (!parshaFilter || e.parshaSlug === parshaFilter) &&
        (!authorFilter || e.author === authorFilter) &&
        (!q || e.title.toLowerCase().includes(q) || e.excerpt.toLowerCase().includes(q))
    );
  }, [essays, query, parshaFilter, authorFilter]);

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

  async function recategorize(e: Essay, slug: string) {
    if (slug === e.parshaSlug) return;
    if (await request(`move-${e.id}`, `/api/zichronyonatan/essays/${e.id}`, "PATCH", { parshaSlug: slug })) {
      setNotice({ kind: "ok", text: `“${e.title}” moved from ${e.parsha} to ${parshaName[slug]}.` });
    }
  }

  async function remove(e: Essay) {
    if (confirming !== e.id) return setConfirming(e.id);
    if (await request(`del-${e.id}`, `/api/zichronyonatan/essays/${e.id}`, "DELETE")) {
      setNotice({ kind: "ok", text: `“${e.title}” was deleted.` });
    }
  }

  if (essays.length === 0) {
    return (
      <p className="zy-form-hint">
        Nothing has been uploaded yet. <Link href="/zichronyonatan/upload">Upload the first dvar Torah</Link>
      </p>
    );
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
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title or text" />
        </label>
        <label className="zy-field">
          <span>Parsha / holiday</span>
          <select value={parshaFilter} onChange={(e) => setParshaFilter(e.target.value)}>
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
          <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}>
            <option value="">All</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="zy-form-hint">No divrei Torah match those filters.</p>
      ) : (
        <ul className="zy-manage-list">
          {shown.map((e) => (
            <li key={e.id} className="zy-manage-item">
              <div className="zy-manage-head">
                <Link href={`/zichronyonatan/manage/${e.id}`} className="zy-manage-title">
                  {e.title}
                </Link>
                <span className="zy-list-sub">
                  {e.author} &middot; uploaded {e.uploaded} &middot; {e.words.toLocaleString()} words
                  {e.emailed ? ` · emailed ${e.emailed}` : ""}
                </span>
              </div>
              <p className="zy-manage-excerpt">{e.excerpt}{e.excerpt.length >= 220 ? "…" : ""}</p>
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
                  <Link href={`/zichronyonatan/manage/${e.id}`} className="zy-button zy-button-small">
                    Edit
                  </Link>
                  <Link
                    href={`/zichronyonatan/parsha/${e.parshaSlug}`}
                    className="zy-button zy-button-quiet zy-button-small"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    className={"zy-link-button" + (confirming === e.id ? " zy-warn" : "")}
                    disabled={!!busy}
                    onClick={() => remove(e)}
                  >
                    {busy === `del-${e.id}` ? "Deleting…" : confirming === e.id ? "Confirm delete" : "Delete"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
