import { getBooks, totalStats } from "@/lib/content-zichronyonatan";
import Link from "next/link";
import FlameMark from "./FlameMark";

export default function ZichryonYonatanHome() {
  const books = getBooks();
  const stats = totalStats();

  return (
    <>
      <header className="zy-site-header">
        <FlameMark />
        <h1 className="zy-site-title">
          Zichron Yonatan
          <span className="zy-site-title-he">זכרון יונתן</span>
        </h1>
        <p className="zy-site-subtitle">
          A weekly d&apos;var Torah, begun in Elul 5777 in loving memory of
          Yonatan ben Avraham Avinu a&quot;h &mdash; carried on since by his
          family, parsha by parsha, year after year.
        </p>
      </header>

      <main className="zy-main" id="zy-content">
        <p className="zy-intro">
          In Elul 5777, days after losing their Uncle Yonatan, this family
          began writing a weekly dvar Torah in his memory. Different hands
          picked it up in different years &mdash; a nephew, a brother, a
          niece, a friend. This site reproduces each essay{" "}
          <strong>word-for-word from the original document</strong> &mdash;
          no summarizing, no rewording. An essay is added here only once it
          has been re-checked directly against the source in Google Drive or
          Gmail.
        </p>

        <div className="zy-stats-row">
          <div className="zy-stat">
            <span className="zy-stat-num">{stats.essayCount}</span>
            <span className="zy-stat-label">Verified essays</span>
          </div>
          <div className="zy-stat">
            <span className="zy-stat-num">{stats.parshaCount}</span>
            <span className="zy-stat-label">Parshiot covered</span>
          </div>
          <div className="zy-stat">
            <span className="zy-stat-num">{stats.authorCount}</span>
            <span className="zy-stat-label">Writers</span>
          </div>
        </div>

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
