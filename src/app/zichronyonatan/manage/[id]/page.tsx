import Link from "next/link";
import { notFound } from "next/navigation";
import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed } from "@/lib/zy-auth";
import { formatEssayDate } from "@/lib/content-zichronyonatan";
import { getCurrentParshaSlug } from "@/lib/current-parsha";
import { getEssayFormOptions } from "@/lib/zy-essays";
import type { ZyEssayRow } from "@/lib/zy-email";
import TopBar from "../../TopBar";
import ZyLogin from "../../ZyLogin";
import EssayForm from "../../EssayForm";
import DeleteEssay from "./DeleteEssay";

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
  await initZyDb();
  const rows = (await sql`SELECT * FROM zy_essays WHERE id = ${id}`) as ZyEssayRow[];
  const essay = rows[0];
  if (!essay) notFound();

  const { parshaGroups, authors } = await getEssayFormOptions();

  return (
    <>
      <TopBar />
      <main className="zy-main" id="zy-content">
        <Link href="/zichronyonatan/manage" className="zy-back-link">
          &larr; All uploaded divrei Torah
        </Link>
        <h1 className="zy-parsha-h1">Edit dvar Torah</h1>
        <p className="zy-form-hint zy-form-intro">
          Uploaded {formatEssayDate(new Date(essay.created_at))}
          {essay.emailed_at
            ? ` · emailed to the list ${formatEssayDate(new Date(essay.emailed_at))} (saving won't re-send it)`
            : ""}
          . Changes go live as soon as you save.
        </p>
        <EssayForm
          parshaGroups={parshaGroups}
          authors={authors}
          defaultParsha={getCurrentParshaSlug() || ""}
          initial={{
            id: essay.id,
            title: essay.title,
            author: essay.author,
            parshaSlug: essay.parsha_slug,
            html: essay.body_html,
          }}
        />
        <DeleteEssay id={essay.id} title={essay.title} />
      </main>
    </>
  );
}
