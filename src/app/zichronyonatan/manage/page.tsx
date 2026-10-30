import Link from "next/link";
import { isZyAuthed } from "@/lib/zy-auth";
import { formatEssayDate, getAllEssays, displayAuthor } from "@/lib/content-zichronyonatan";
import { getEssayFormOptions } from "@/lib/zy-essays";
import { htmlToText } from "@/lib/zy-html";
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
          <ZyLogin heading="Manage Divrei Torah" />
        </main>
      </>
    );
  }

  const [all, { parshaGroups }] = await Promise.all([
    getAllEssays({ includeHidden: true }),
    getEssayFormOptions(),
  ]);

  // Site uploads first (newest first), then the archive in parsha order.
  const ordered = all
    .filter((e) => !e.placeholder)
    .sort((a, b) => {
      if (!!a.uploaded !== !!b.uploaded) return a.uploaded ? -1 : 1;
      if (a.uploaded) return Date.parse(b.createdAt!) - Date.parse(a.createdAt!);
      if (a.bookOrder !== b.bookOrder) return a.bookOrder - b.bookOrder;
      if (a.order !== b.order) return a.order - b.order;
      return (b.year || "").localeCompare(a.year || "");
    });

  const essays = ordered.map((e) => {
      const text = (e.html ? htmlToText(e.html) : e.body).replace(/\s+/g, " ").trim();
      return {
        id: e.id,
        title: e.title,
        author: displayAuthor(e.author) || "Unsigned",
        parshaSlug: e.parshaSlug,
        parsha: e.parsha,
        date: e.date,
        uploaded: !!e.uploaded,
        edited: !!e.edited,
        hidden: !!e.hidden,
        emailed: e.emailedAt ? formatEssayDate(new Date(e.emailedAt)) : null,
        words: text.split(" ").filter(Boolean).length,
        excerpt: text.slice(0, 220),
      };
    });

  const uploadedCount = essays.filter((e) => e.uploaded).length;

  return (
    <>
      <TopBar />
      <main className="zy-main" id="zy-content">
        <h1 className="zy-parsha-h1">Manage Divrei Torah</h1>
        <span className="zy-parsha-book-tag">
          {essays.length} Divrei Torah &middot; {uploadedCount} uploaded on the site &middot;{" "}
          <Link href="/zichronyonatan/upload">Upload a new one</Link>
        </span>
        <ManageList essays={essays} parshaGroups={parshaGroups} />
      </main>
    </>
  );
}
