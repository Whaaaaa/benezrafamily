import { NextRequest, NextResponse } from "next/server";
import { checkZyPassword, createZySession, ZY_COOKIE } from "@/lib/zy-auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({}));
  if (!process.env.ZY_ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ZY_ADMIN_PASSWORD is not set on the server" }, { status: 500 });
  }
  if (!checkZyPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  const { value, maxAge } = await createZySession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ZY_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ZY_COOKIE);
  return response;
}
