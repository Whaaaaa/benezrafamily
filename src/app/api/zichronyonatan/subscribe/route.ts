import sql, { initZyDb } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/zy-email";

const EMAIL_RE = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[a-z]{2,}$/i;
// Don't send another confirmation to the same address more often than this.
const RESEND_MINUTES = 15;

// Public newsletter sign-up from the homepage. Nobody is added until they
// click the link in the confirmation email (double opt-in), so a typo or a
// bot can't put someone else on the list.
export async function POST(req: Request) {
  const { email, name, website } = await req.json().catch(() => ({}));

  // `website` is a hidden field real visitors never fill in; bots do.
  if (website) return Response.json({ ok: true });

  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(name || "").trim().replace(/\s+/g, " ").slice(0, 100);
  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  await initZyDb();

  // Same response whether or not they're already subscribed, so the form
  // can't be used to check who is on the list.
  const existing = await sql`SELECT 1 FROM zy_subscribers WHERE email = ${cleanEmail}`;
  if (existing.length) return Response.json({ ok: true });

  const recent = await sql`
    SELECT 1 FROM zy_pending_subscribers
    WHERE email = ${cleanEmail} AND created_at > NOW() - make_interval(mins => ${RESEND_MINUTES})
  `;
  if (recent.length) return Response.json({ ok: true });

  const token = crypto.randomUUID();
  await sql`DELETE FROM zy_pending_subscribers WHERE email = ${cleanEmail}`;
  await sql`INSERT INTO zy_pending_subscribers (token, email, name) VALUES (${token}, ${cleanEmail}, ${cleanName})`;

  try {
    await sendConfirmationEmail(cleanEmail, cleanName, token);
  } catch (err) {
    console.error("zy confirmation email failed", cleanEmail, err);
    await sql`DELETE FROM zy_pending_subscribers WHERE token = ${token}`;
    return Response.json(
      { error: "We couldn't send the confirmation email right now. Please try again later." },
      { status: 500 }
    );
  }
  return Response.json({ ok: true });
}
