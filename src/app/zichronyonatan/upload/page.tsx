import { getCurrentParshaSlug } from "@/lib/current-parsha";
import { isZyAuthed } from "@/lib/zy-auth";
import { getEssayFormOptions } from "@/lib/zy-essays";
import TopBar from "../TopBar";
import ZyLogin from "../ZyLogin";
import EssayForm from "../EssayForm";

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

  const { parshaGroups, authors } = await getEssayFormOptions();

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
        <EssayForm
          parshaGroups={parshaGroups}
          authors={authors}
          defaultParsha={getCurrentParshaSlug() || ""}
        />
      </main>
    </>
  );
}
