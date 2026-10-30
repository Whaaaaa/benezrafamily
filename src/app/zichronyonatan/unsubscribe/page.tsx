import sql, { initZyDb } from "@/lib/db";
import TopBar from "../TopBar";
import UnsubscribeButton from "./UnsubscribeButton";

export const metadata = { title: "Unsubscribe | Zichron Yonatan" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  await initZyDb();
  const rows = (await sql`SELECT email FROM zy_subscribers WHERE token = ${token}`) as { email: string }[];
  const email = rows[0]?.email;

  return (
    <>
      <TopBar />
      <main className="zy-main" id="zy-content">
        <div className="zy-panel zy-login">
          <h1 className="zy-parsha-h1">Unsubscribe</h1>
          {email ? (
            <>
              <p>
                Stop sending the weekly Zichron Yonatan email to <strong>{email}</strong>?
              </p>
              <UnsubscribeButton token={token} />
            </>
          ) : (
            <p>
              This address isn&apos;t on the mailing list (it may already have been
              removed). The archive is always here at{" "}
              <a href="/zichronyonatan">Zichron Yonatan</a>.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
