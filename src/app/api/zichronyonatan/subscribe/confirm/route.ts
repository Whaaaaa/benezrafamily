import sql, { initZyDb } from "@/lib/db";

// Link lifetime for confirmation emails.
const EXPIRES_DAYS = 7;

// Called by the button on /zichronyonatan/confirm (POST only, so email link
// scanners that prefetch pages can't confirm on someone's behalf).
export async function POST(req: Request) {
  await initZyDb();
  const token = new URL(req.url).searchParams.get("token") || "";
  const rows = (await sql`
    DELETE FROM zy_pending_subscribers
    WHERE token = ${token} AND created_at > NOW() - make_interval(days => ${EXPIRES_DAYS})
    RETURNING email, name
  `) as { email: string; name: string }[];
  const pending = rows[0];
  if (!pending) {
    return Response.json({ error: "This confirmation link has expired or was already used." }, { status: 404 });
  }
  await sql`
    INSERT INTO zy_subscribers (email, name, token)
    VALUES (${pending.email}, ${pending.name}, ${crypto.randomUUID()})
    ON CONFLICT (email) DO NOTHING
  `;
  return Response.json({ ok: true, email: pending.email });
}
