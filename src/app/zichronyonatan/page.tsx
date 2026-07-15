import { getBooks, totalStats } from "@/lib/content-zichronyonatan";
import Link from "next/link";
import "./styles.css";

export const metadata = {
  title: "Zichron Yonatan | A Family Torah Archive",
  description:
    "Weekly divrei Torah written in loving memory of Yonatan ben Avraham Avinu a\"h, collected across the Torah's parshiot and holidays.",
};

export default function ZichryonYonatanHome() {
  const books = getBooks();
  const stats = totalStats();

  return (
    <>
      <header className="zy-site-header">
        <svg className="zy-flame-mark" viewBox="0 0 22 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M11 0C11 6 4 8 4 16C4 22.6 8 27 11 30C14 27 18 22.6 18 16C18 12 15.5 10.5 15 8C14.7 10 13 11 12 9.5C11 8 12.5 5.5 11 0Z" fill="#e3a75e" fillOpacity="0.9"/>
          <path d="M11 12C11 15 8 16.5 8 20C8 23.5 9.7 26 11 27.5C12.3 26 14 23.5 14 20C14 17.5 12.7 16.5 12.4 15C12.2 16 11.4 16.5 10.9 15.7C10.4 15 11.4 13.7 11 12Z" fill="#14120f" fillOpacity="0.55"/>
        </svg>
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

      <main className="zy-main">
        <p className="zy-intro">
          In Elul 5777, days after losing their Uncle Yonatan, this family
          began writing a weekly dvar Torah in his memory and sending it every
          Friday to everyone who loved him. Different hands picked it up in
          different years &mdash; a nephew, a brother, a niece, a friend &mdash;
          but the practice never stopped. This site collects what survives of
          that archive, organized the way the Torah itself is read: parsha by
          parsha, book by book, with every version kept side by side rather
          than reduced to one.
        </p>

        <div className="zy-stats-row">
          <div className="zy-stat">
            <span className="zy-stat-num">{stats.essayCount}</span>
            <span className="zy-stat-label">Essays</span>
          </div>
          <div className="zy-stat">
            <span className="zy-stat-num">{stats.parshaCount}</span>
            <span className="zy-stat-label">Parshiot &amp; Holidays</span>
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
                  className={"zy-parsha-card" + (p.count === 1 && p.authors.length === 0 ? " zy-is-placeholder" : "")}
                >
                  <h3>{p.parsha}</h3>
                  <span>
                    {p.count} essay{p.count === 1 ? "" : "s"}
                    {p.authors.length ? ` · ${p.authors.join(", ")}` : ""}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="zy-site-footer">
        <p>
          The learning on this site should be a merit for the neshama of
          Yonatan ben Avraham Avinu a&quot;h.
        </p>
      </footer>
    </>
  );
}
