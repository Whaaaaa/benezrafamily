import { getEssaysForParsha, getParshiot, getParshaMeta } from "@/lib/content-zichronyonatan";
import { notFound } from "next/navigation";
import Link from "next/link";
import TopBar from "../../TopBar";

export function generateStaticParams() {
  return getParshiot().map((p) => ({ slug: p.slug }));
}

export default async function ParshaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const essays = getEssaysForParsha(slug);
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

        {verified.map((e) => (
          <article key={e.slug} className="zy-essay">
            <h2 className="zy-essay-title">{e.title}</h2>
            <div className="zy-essay-meta">
              {e.date}
              {e.author ? ` · ${e.author}` : ""}
              {" · "}
              <span className="zy-verbatim-tag">verbatim, {e.source}</span>
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
