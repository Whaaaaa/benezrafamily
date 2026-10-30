import Link from "next/link";
import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed } from "@/lib/zy-auth";
import { formatEssayDate, getArchiveParshiot } from "@/lib/content-zichronyonatan";
import { getEssayFormOptions } from "@/lib/zy-essays";
import { htmlToText } from "@/lib/zy-html";
import type { ZyEssayRow } from "@/lib/zy-email";
import TopBar from "../TopBar";
import ZyLogin from "../ZyLogin";
import ManageList from "./ManageList";

export const metadata = { title: "Manage Divrei Torah | Zichron Yonatan" };

export default async function ManagePage() {
  if (!(await isZyAuthed())) {
    return (
      <>
        <TopBar />
        <main className="zy-main" id="zy-content">
          <ZyLogin heading="Manage divrei Torah" />
        </main>
      </>
    );
  }

  await initZyDb();
  const rows = (await sql`SELECT * FROM zy_essays ORDER BY created_at DESC`) as ZyEssayRow[];
  const { parshaGroups } = await getEssayFormOptions();
  const parshaNames = Object.fromEntries(getArchiveParshiot().map((p) => [p.slug, p.parsha]));

  const essays = rows.map((e) => {
    const text = htmlToText(e.body_html);
    return {
      id: e.id,
      title: e.title,
      author: e.author,
      parshaSlug: e.parsha_slug,
      parsha: parshaNames[e.parsha_slug] || e.parsha_slug,
      uploaded: formatEssayDate(new Date(e.created_at)),
      emailed: e.emailed_at ? formatEssayDate(new Date(e.emailed_at)) : null,
      words: text.split(/\s+/).filter(Boolean).length,
      excerpt: text.replace(/\s+/g, " ").slice(0, 220),
    };
  });

  return (
    <>
      <TopBar />
      <main className="zy-main" id="zy-content">
        <h1 className="zy-parsha-h1">Manage divrei Torah</h1>
        <span className="zy-parsha-book-tag">
          {essays.length} uploaded &middot;{" "}
          <Link href="/zichronyonatan/upload">Upload a new one</Link>
        </span>
        <ManageList essays={essays} parshaGroups={parshaGroups} />
      </main>
    </>
  );
}
