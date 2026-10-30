import sql, { initZyDb } from "@/lib/db";
import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { parseList } from "@/lib/zy-list";

export async function GET() {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();
  const rows = await sql`SELECT email, name, created_at FROM zy_subscribers ORDER BY created_at DESC, email`;
  return Response.json(rows);
}

export async function POST(req: Request) {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();
  const { text } = await req.json();
  const { entries, unreadable } = parseList(String(text || ""));
  if (entries.size === 0) {
    return Response.json({ added: 0, existing: 0, unreadable });
  }

  const emails = Array.from(entries.keys());
  const names = emails.map((e) => entries.get(e) || "");
  const tokens = emails.map(() => crypto.randomUUID());
  const inserted = (await sql`
    INSERT INTO zy_subscribers (email, name, token)
    SELECT * FROM unnest(${emails}::text[], ${names}::text[], ${tokens}::text[])
    ON CONFLICT (email) DO NOTHING
    RETURNING email
  `) as { email: string }[];

  // Fill in names for people who were already on the list without one.
  await sql`
    UPDATE zy_subscribers s SET name = u.name
    FROM unnest(${emails}::text[], ${names}::text[]) AS u(email, name)
    WHERE s.email = u.email AND s.name = '' AND u.name <> ''
  `;

  return Response.json({
    added: inserted.length,
    existing: emails.length - inserted.length,
    unreadable,
  });
}

export async function DELETE(req: Request) {
  if (!(await isZyAuthed())) return unauthorized();
  await initZyDb();
  const { email } = await req.json();
  await sql`DELETE FROM zy_subscribers WHERE email = ${String(email || "").toLowerCase()}`;
  return Response.json({ ok: true });
}
