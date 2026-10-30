import { getArchiveParshiot, getAuthors } from "@/lib/content-zichronyonatan";
import { getCurrentParshaSlug } from "@/lib/current-parsha";
import { isZyAuthed } from "@/lib/zy-auth";
import TopBar from "../TopBar";
import ZyLogin from "../ZyLogin";
import UploadForm from "./UploadForm";

export const metadata = { title: "Upload a Dvar Torah | Zichron Yonatan" };

export default async function UploadPage() {
  if (!(await isZyAuthed())) {
    return (
      <>
        <TopBar />
        <main className="zy-main" id="zy-content">
          <ZyLogin heading="Upload a dvar Torah" />
        </main>
      </>
    );
  }

  const groups = new Map<string, { slug: string; parsha: string }[]>();
  for (const p of getArchiveParshiot()) {
    if (!groups.has(p.book)) groups.set(p.book, []);
    groups.get(p.book)!.push({ slug: p.slug, parsha: p.parsha });
  }

  // "Unsigned (Drive archive, 2019)" etc. describe where an old essay came
  // from rather than who wrote it, so they aren't offered for new uploads.
  const authors = (await getAuthors()).filter((a) => !a.startsWith("Unsigned"));

  return (
    <>
      <TopBar />
      <main className="zy-main" id="zy-content">
        <h1 className="zy-parsha-h1">Upload a dvar Torah</h1>
        <p className="zy-form-hint zy-form-intro">
          Paste it straight from Google Docs, Word, or an email &mdash; bold,
          italics, headings, quotes and Hebrew are kept. It&apos;s published
          the moment you hit Publish.
        </p>
        <UploadForm
          parshaGroups={Array.from(groups, ([book, parshiot]) => ({ book, parshiot }))}
          authors={authors}
          defaultParsha={getCurrentParshaSlug() || ""}
        />
      </main>
    </>
  );
}
