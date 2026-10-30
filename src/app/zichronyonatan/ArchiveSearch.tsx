"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type SearchItem = {
  slug: string;
  title: string;
  parsha: string;
  parshaSlug: string;
  author: string;
  year: string;
};

// Search + filters for the homepage. While a search is active it shows the
// matching Divrei Torah in place of the book-by-book list (`children`).
export default function ArchiveSearch({ items, children }: { items: SearchItem[]; children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");

  const authors = useMemo(
    () => Array.from(new Set(items.map((i) => i.author).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [items]
  );
  const years = useMemo(
    () => Array.from(new Set(items.map((i) => i.year).filter(Boolean))).sort().reverse(),
    [items]
  );

  const q = query.trim().toLowerCase();
  const active = !!(q || author || year);
  const results = useMemo(
    () =>
      active
        ? items.filter(
            (i) =>
              (!author || i.author === author) &&
              (!year || i.year === year) &&
              (!q || `${i.title} ${i.parsha} ${i.author} ${i.year}`.toLowerCase().includes(q))
          )
        : [],
    [items, active, q, author, year]
  );

  return (
    <>
      <section className="zy-search" aria-label="Search the archive">
        <input
          type="search"
          className="zy-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, parsha or author"
          aria-label="Search Divrei Torah"
        />
        <select value={author} onChange={(e) => setAuthor(e.target.value)} aria-label="Filter by author">
          <option value="">All authors</option>
          {authors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Filter by year">
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {active && (
          <button
            type="button"
            className="zy-link-button"
            onClick={() => {
              setQuery("");
              setAuthor("");
              setYear("");
            }}
          >
            Clear
          </button>
        )}
      </section>

      {active ? (
        <section className="zy-search-results" aria-live="polite">
          <p className="zy-search-count">
            {results.length} {results.length === 1 ? "Dvar Torah" : "Divrei Torah"}
          </p>
          <ul>
            {results.map((i) => (
              <li key={`${i.parshaSlug}/${i.slug}`}>
                <Link href={`/zichronyonatan/parsha/${i.parshaSlug}#${i.slug}`}>{i.title}</Link>
                <span>{[i.parsha, i.author, i.year].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        children
      )}
    </>
  );
}
