import sql, { initZyDb } from "@/lib/db";
import { sendUnsubscribeLink } from "@/lib/zy-email";

// The weekly email is shared by the whole list, so its unsubscribe link
// can't be personal. People enter their address here and get their own
// link by email, which means nobody can remove someone else. The reply is
// the same whether or not the address is subscribed.
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const address = String(email || "").trim().toLowerCase();
  if (!address.includes("@") || address.length > 254) {
    return Response.json({ error: "Please enter your email address." }, { status: 400 });
  }
  await initZyDb();
  const rows = (await sql`
    SELECT email, token FROM zy_subscribers WHERE lower(email) = ${address}
  `) as { email: string; token: string }[];
  if (rows[0]) {
    try {
      await sendUnsubscribeLink(rows[0].email, rows[0].token);
    } catch (err) {
      console.error("zy unsubscribe link failed", err);
      return Response.json({ error: "Couldn't send the email. Please try again later." }, { status: 500 });
    }
  }
  return Response.json({ ok: true });
}
