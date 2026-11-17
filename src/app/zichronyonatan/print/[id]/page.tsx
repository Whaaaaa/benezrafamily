import { getManagedEssay, displayAuthor } from "@/lib/content-zichronyonatan";
import { notFound } from "next/navigation";
import Link from "next/link";
import PrintButton from "./PrintButton";

export const metadata = {
  title: "Print | Zichron Yonatan",
  robots: { index: false },
};

/**
 * A printer-friendly copy of one Dvar Torah: no site chrome, black on white,
 * sized for a page. Linked from each essay on the parsha page and from the
 * weekly email; `?auto=1` opens the print dialog on load.
 */
export default async function PrintEssayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const { id: rawId } = await params;
  const { auto } = await searchParams;
  let id = rawId;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    // keep the raw value
  }

  const essay = await getManagedEssay(id);
  if (!essay || essay.hidden || essay.placeholder) return notFound();

  const author = displayAuthor(essay.author);
  const meta = [essay.parsha, essay.date, author].filter(Boolean).join(" · ");

  return (
    <main className="zy-print-page" id="zy-content">
      <div className="zy-print-toolbar">
        <Link href={`/zichronyonatan/parsha/${essay.parshaSlug}#${essay.slug}`} className="zy-back-link">
          &larr; Back to {essay.parsha}
        </Link>
        <PrintButton autoPrint={auto === "1"} />
      </div>

      <article className="zy-print-sheet">
        <header className="zy-print-header">
          <div className="zy-print-brand">
            Zichron Yonatan · <span dir="rtl">זכרון יונתן</span>
          </div>
          <h1 className="zy-print-title">{essay.title}</h1>
          <div className="zy-print-meta">{meta}</div>
        </header>

        {essay.html ? (
          // Sanitized against a strict allowlist when it was saved.
          <div className="zy-essay-body zy-print-body" dangerouslySetInnerHTML={{ __html: essay.html }} />
        ) : (
          <div className="zy-essay-body zy-print-body">
            {essay.body.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        <footer className="zy-print-footer">
          The learning in this Dvar Torah should be a merit for the neshama of
          Yonatan ben Avraham Avinu a&quot;h.
          <br />
          Please treat this page with respect, as it contains words of Torah.
        </footer>
      </article>
    </main>
  );
}
