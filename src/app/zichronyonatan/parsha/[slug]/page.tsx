import { getEssaysForParsha, getParshiot, getParshaMeta } from "@/lib/content-zichronyonatan";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return getParshiot().map((p) => ({ slug: p.slug }));
}

export default function ParshaPage({ params }: { params: { slug: string } }) {
  const essays = getEssaysForParsha(params.slug);
  const meta = getParshaMeta(params.slug);
  if (!meta) return notFound();

  const real = essays.filter((e) => !e.placeholder);
  const placeholders = essays.filter((e) => e.placeholder);

  return (
    <>
      <Link href="/zichronyonatan" className="zy-back-link">
        &larr; All parshiot
      </Link>
      <h1 className="zy-parsha-h1">{meta.parsha}</h1>
      <span className="zy-parsha-book-tag">{meta.book}</span>

      {real.length === 0 && placeholders.length > 0 && (
        <p className="zy-placeholder-note">
          No essay for {meta.parsha} has been transcribed into this archive
          yet, though family correspondence references one having been
          written. If you find it, it can be added here.
        </p>
      )}

      {real.map((e) => (
        <article key={e.slug} className="zy-essay">
          <h2 className="zy-essay-title">{e.title}</h2>
          <div className="zy-essay-meta">
            {e.date}
            {e.author ? ` · ${e.author}` : ""}
          </div>
          <div className="zy-essay-body">
            {e.body.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </article>
      ))}

      {placeholders.length > 0 && real.length > 0 && (
        <p className="zy-placeholder-note">
          {placeholders.length === 1
            ? "One further reference to an essay for this parsha exists in family correspondence but wasn't recovered as a standalone document."
            : `${placeholders.length} further references to essays for this parsha exist in family correspondence but weren't recovered as standalone documents.`}
        </p>
      )}
    </>
  );
}
