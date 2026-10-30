import { getAllEssays, getBooks, getParshaMeta, getEssaysForParsha, displayAuthor } from "@/lib/content-zichronyonatan";
import { getCurrentParshaSlug } from "@/lib/current-parsha";
import Link from "next/link";
import FlameMark from "./FlameMark";
import { ZyNav } from "./TopBar";
import ArchiveSearch, { type SearchItem } from "./ArchiveSearch";

// The featured parsha depends on the current date, so re-render hourly
// instead of freezing the page at build time; uploads revalidate it
// immediately.
export const revalidate = 3600;

export default async function ZichryonYonatanHome() {
  const books = await getBooks();

  // Small index for the search box: titles, parshiot, authors and years.
  const searchItems: SearchItem[] = (await getAllEssays())
    .filter((e) => e.verbatim && !e.placeholder)
    .sort((a, b) => a.bookOrder - b.bookOrder || a.order - b.order || b.year.localeCompare(a.year))
    .map((e) => ({
      slug: e.slug,
      title: e.title,
      parsha: e.parsha,
      parshaSlug: e.parshaSlug,
      author: displayAuthor(e.author),
      year: e.year,
    }));

  const currentSlug = getCurrentParshaSlug();
  const currentMeta = currentSlug ? await getParshaMeta(currentSlug) : undefined;
  const currentEssays = currentSlug
    ? (await getEssaysForParsha(currentSlug)).filter((e) => e.verbatim && !e.placeholder)
    : [];

  return (
    <>
      <div className="zy-hero-nav">
        <ZyNav />
      </div>
      <header className="zy-site-header">
        <FlameMark />
        <h1 className="zy-site-title">
          Zichron Yonatan
          <span className="zy-site-title-he">זכרון יונתן</span>
        </h1>
        <div className="zy-header-photo">
          <img src="/yonatan-photo.jpg" alt="" />
        </div>
      </header>

      <main className="zy-main" id="zy-content">
        {currentMeta && currentEssays.length > 0 && (
          <section className="zy-featured">
            <span className="zy-featured-eyebrow">This week&apos;s parsha</span>
            <h2 className="zy-featured-title">{currentMeta.parsha}</h2>
            <ul className="zy-featured-list">
              {currentEssays.map((e) => (
                <li key={e.slug}>
                  <Link href={`/zichronyonatan/parsha/${currentSlug}#${e.slug}`}>
                    {e.title}
                  </Link>
                  {e.year ? <span> &middot; {e.year}</span> : null}
                  {displayAuthor(e.author) ? <span> &middot; {displayAuthor(e.author)}</span> : null}
                </li>
              ))}
            </ul>
            <Link href={`/zichronyonatan/parsha/${currentSlug}`} className="zy-featured-cta">
              Read this week&apos;s Divrei Torah &rarr;
            </Link>
          </section>
        )}

        <ArchiveSearch items={searchItems}>
        {books.map((b, bi) => (
          <details className="zy-book-section" key={b.book}>
            <summary className="zy-book-heading">
              <span className="zy-book-index">{String(bi + 1).padStart(2, "0")}</span>
              {b.book}
            </summary>
            <div className="zy-parsha-grid">
              {b.parshiot.map((p) => {
                const yearRange =
                  p.years.length > 1
                    ? `${p.years[0]}–${p.years[p.years.length - 1]}`
                    : p.years[0];
                return (
                  <Link
                    key={p.slug}
                    href={`/zichronyonatan/parsha/${p.slug}`}
                    className={"zy-parsha-card" + (!p.hasVerified ? " zy-is-placeholder" : "")}
                  >
                    <h3>{p.parsha}</h3>
                    {p.hasVerified ? (
                      <span>
                        {p.count} essay{p.count === 1 ? "" : "s"}
                        {yearRange ? ` · ${yearRange}` : ""}
                        {p.authors.length ? ` · ${p.authors.join(", ")}` : ""}
                      </span>
                    ) : (
                      <span className="zy-placeholder-tag">Pending re-verification</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </details>
        ))}
        </ArchiveSearch>
      </main>
    </>
  );
}
