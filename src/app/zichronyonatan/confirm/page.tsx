import sql, { initZyDb } from "@/lib/db";
import TopBar from "../TopBar";
import ConfirmButton from "./ConfirmButton";

export const metadata = { title: "Confirm Subscription | Zichron Yonatan" };

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  await initZyDb();
  const rows = (await sql`
    SELECT email FROM zy_pending_subscribers
    WHERE token = ${token} AND created_at > NOW() - INTERVAL '7 days'
  `) as { email: string }[];
  const email = rows[0]?.email;

  return (
    <>
      <TopBar />
      <main className="zy-main" id="zy-content">
        <div className="zy-panel zy-login">
          <h1 className="zy-parsha-h1">Weekly Dvar Torah</h1>
          {email ? (
            <>
              <p>
                Confirm that <strong>{email}</strong> should receive the Zichron Yonatan Dvar Torah every
                Friday before Shabbat.
              </p>
              <ConfirmButton token={token} />
            </>
          ) : (
            <p>
              This confirmation link has expired or was already used. If you&apos;re not getting the emails,
              sign up again from the <a href="/zichronyonatan">Zichron Yonatan homepage</a>.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
