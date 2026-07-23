import { getEssaysForParsha, getParshiot, getParshaMeta, displayAuthor, EssaySort } from "@/lib/content-zichronyonatan";
import { notFound } from "next/navigation";
import Link from "next/link";
import TopBar from "../../TopBar";

export function generateStaticParams() {
  return getParshiot().map((p) => ({ slug: p.slug }));
}

export default async function ParshaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const { sort: sortParam } = await searchParams;
  const sort: EssaySort = sortParam === "author" ? "author" : "date";

  const essays = getEssaysForParsha(slug, sort);
  const meta = getParshaMeta(slug);
  if (!meta) return notFound();

  const verified = essays.filter((e) => e.verbatim && !e.placeholder);
  const pending = essays.filter((e) => e.placeholder);

  return (
    <>
      <TopBar />
      <main className="zy-main" id="zy-content">
        <Link href="/zichronyonatan" className="zy-back-link">
          &larr; All parshiot
        </Link>
        <h1 className="zy-parsha-h1">{meta.parsha}</h1>
        <span className="zy-parsha-book-tag">{meta.book}</span>

        {pending.length > 0 && (
          <p className="zy-placeholder-note">
            An essay for {meta.parsha} exists in the family archive but
            hasn&apos;t been re-fetched and verified word-for-word yet in this
            pass, so it&apos;s intentionally left off this page rather than
            shown in a paraphrased form.
          </p>
        )}

        {verified.length > 1 && (
          <div className="zy-parsha-controls">
            <nav className="zy-jump-nav" aria-label="Jump to an essay">
              <span className="zy-jump-nav-label">Jump to:</span>
              {verified.map((e) => (
                <a key={e.slug} href={`#${e.slug}`}>
                  {sort === "author"
                    ? `${displayAuthor(e.author) || "Unsigned"} (${e.year})`
                    : `${e.year}${displayAuthor(e.author) ? ` – ${displayAuthor(e.author)}` : ""}`}
                </a>
              ))}
            </nav>
            <div className="zy-sort-toggle">
              Sort by:{" "}
              <Link
                href={`/zichronyonatan/parsha/${slug}`}
                className={sort === "date" ? "zy-sort-active" : ""}
              >
                Year
              </Link>{" "}
              ·{" "}
              <Link
                href={`/zichronyonatan/parsha/${slug}?sort=author`}
                className={sort === "author" ? "zy-sort-active" : ""}
              >
                Author
              </Link>
            </div>
          </div>
        )}

        {verified.map((e) => (
          <article key={e.slug} id={e.slug} className="zy-essay">
            <h2 className="zy-essay-title">
              {e.title}
              {e.year ? <span className="zy-essay-year">{e.year}</span> : null}
            </h2>
            <div className="zy-essay-meta">
              {e.date}
              {displayAuthor(e.author) ? ` · ${displayAuthor(e.author)}` : ""}
            </div>
            <div className="zy-essay-body">
              {e.body.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </article>
        ))}
      </main>
    </>
  );
}
