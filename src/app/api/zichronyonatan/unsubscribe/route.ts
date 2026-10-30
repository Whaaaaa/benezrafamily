import sql, { initZyDb } from "@/lib/db";

// Used by the unsubscribe page's button and by mail clients' one-click
// unsubscribe (RFC 8058 List-Unsubscribe-Post), so it only acts on POST —
// link scanners that prefetch GETs can't unsubscribe anyone.
export async function POST(req: Request) {
  await initZyDb();
  const token = new URL(req.url).searchParams.get("token") || "";
  await sql`DELETE FROM zy_subscribers WHERE token = ${token}`;
  return Response.json({ ok: true });
}
