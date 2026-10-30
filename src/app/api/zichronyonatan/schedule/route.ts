import { isZyAuthed, unauthorized } from "@/lib/zy-auth";
import { setSendCancelled } from "@/lib/zy-email";

// Cancel or restore one Friday's scheduled email: { sendDate, cancelled }.
export async function POST(req: Request) {
  if (!(await isZyAuthed())) return unauthorized();
  const { sendDate, cancelled } = await req.json();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(sendDate))) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }
  await setSendCancelled(sendDate, !!cancelled);
  return Response.json({ ok: true });
}
