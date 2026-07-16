import TopBar from "./TopBar";

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="zy-main zy-not-found" id="zy-content">
        <h1>Not Found</h1>
        <p>The page you&apos;re looking for doesn&apos;t exist in the Zichron Yonatan archive.</p>
        <a href="/zichronyonatan">Back to Zichron Yonatan</a>
      </main>
    </>
  );
}
