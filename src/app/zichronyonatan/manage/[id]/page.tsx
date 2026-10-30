import Link from "next/link";
import { notFound } from "next/navigation";
import { isZyAuthed } from "@/lib/zy-auth";
import {
  archiveBodyToHtml,
  formatEssayDate,
  getManagedEssay,
  getOriginalArchiveEssay,
} from "@/lib/content-zichronyonatan";
import { getCurrentParshaSlug } from "@/lib/current-parsha";
import { getEssayFormOptions } from "@/lib/zy-essays";
import TopBar from "../../TopBar";
import ZyLogin from "../../ZyLogin";
import EssayForm from "../../EssayForm";
import DeleteEssay from "./DeleteEssay";
import ArchiveActions from "./ArchiveActions";

export const metadata = { title: "Edit Dvar Torah | Zichron Yonatan" };

export default async function EditEssayPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isZyAuthed())) {
    return (
      <>
        <TopBar />
        <main className="zy-main" id="zy-content">
          <ZyLogin heading="Edit dvar Torah" />
        </main>
      </>
    );
  }

  const { id } = await params;
  const essay = await getManagedEssay(decodeURIComponent(id));
  if (!essay || essay.placeholder) notFound();

  const original = essay.uploaded ? undefined : getOriginalArchiveEssay(essay.id);
  const html = essay.html ?? archiveBodyToHtml(original?.body ?? essay.body);
  const { parshaGroups, authors } = await getEssayFormOptions();

  return (
    <>
      <TopBar />
      <main className="zy-main" id="zy-content">
        <Link href="/zichronyonatan/manage" className="zy-back-link">
          &larr; All divrei Torah
        </Link>
        <h1 className="zy-parsha-h1">Edit dvar Torah</h1>
        {essay.uploaded ? (
          <p className="zy-form-hint zy-form-intro">
            Uploaded {essay.date}
            {essay.emailedAt
              ? ` · emailed to the list ${formatEssayDate(new Date(essay.emailedAt))} (saving won't re-send it)`
              : ""}
            . Changes go live as soon as you save.
          </p>
        ) : (
          <p className="zy-form-hint zy-form-intro">
            From the family archive{essay.date ? `, ${essay.date}` : ""}
            {original?.source ? ` (${original.source})` : ""}. Changes go live as soon as you save; the
            original is kept, so you can always revert.
            {essay.hidden && <strong> This dvar Torah is currently hidden from the site.</strong>}
          </p>
        )}
        <EssayForm
          parshaGroups={parshaGroups}
          authors={authors}
          defaultParsha={getCurrentParshaSlug() || ""}
          requireAuthor={!!essay.uploaded}
          initial={{
            id: essay.id,
            title: essay.title,
            author: essay.author,
            parshaSlug: essay.parshaSlug,
            html,
          }}
        />
        {essay.uploaded ? (
          <DeleteEssay id={essay.id} title={essay.title} />
        ) : (
          <ArchiveActions id={essay.id} title={essay.title} edited={!!essay.edited} hidden={!!essay.hidden} />
        )}
      </main>
    </>
  );
}
