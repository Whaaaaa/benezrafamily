import { getBooks, getParshaMeta, getEssaysForParsha } from "@/lib/content-zichronyonatan";
import { getCurrentParshaSlug } from "@/lib/current-parsha";
import Link from "next/link";
import FlameMark from "./FlameMark";

export default function ZichryonYonatanHome() {
  const books = getBooks();

  const currentSlug = getCurrentParshaSlug();
  const currentMeta = currentSlug ? getParshaMeta(currentSlug) : undefined;
  const currentEssays = currentSlug
    ? getEssaysForParsha(currentSlug).filter((e) => e.verbatim && !e.placeholder)
    : [];

  return (
    <>
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
                  <Link href={`/zichronyonatan/parsha/${currentSlug}`}>
                    {e.title}
                  </Link>
                  {e.author ? <span> &middot; {e.author}</span> : null}
                </li>
              ))}
            </ul>
            <Link href={`/zichronyonatan/parsha/${currentSlug}`} className="zy-featured-cta">
              Read this week&apos;s divrei Torah &rarr;
            </Link>
          </section>
        )}

        {books.map((b, bi) => (
          <section className="zy-book-section" key={b.book}>
            <h2 className="zy-book-heading">
              <span className="zy-book-index">{String(bi + 1).padStart(2, "0")}</span>
              {b.book}
            </h2>
            <div className="zy-parsha-grid">
              {b.parshiot.map((p) => (
                <Link
                  key={p.slug}
                  href={`/zichronyonatan/parsha/${p.slug}`}
                  className={"zy-parsha-card" + (!p.hasVerified ? " zy-is-placeholder" : "")}
                >
                  <h3>{p.parsha}</h3>
                  {p.hasVerified ? (
                    <span>
                      {p.count} essay{p.count === 1 ? "" : "s"}
                      {p.authors.length ? ` · ${p.authors.join(", ")}` : ""}
                    </span>
                  ) : (
                    <span className="zy-placeholder-tag">Pending re-verification</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
