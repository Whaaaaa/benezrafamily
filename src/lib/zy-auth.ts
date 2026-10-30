import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "crypto";

// Zichron Yonatan has its own password (ZY_ADMIN_PASSWORD), separate from the
// family-site login, so contributors can upload divrei Torah and manage the
// mailing list without getting access to the rest of the site.
export const ZY_COOKIE = "zy_session";
const MAX_AGE = 60 * 60 * 24 * 90;

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET!);
}

export function checkZyPassword(password: string): boolean {
  const expected = process.env.ZY_ADMIN_PASSWORD;
  if (!expected || typeof password !== "string") return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createZySession(): Promise<{ value: string; maxAge: number }> {
  const value = await new SignJWT({ zy: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  return { value, maxAge: MAX_AGE };
}

export async function isZyAuthed(): Promise<boolean> {
  const token = (await cookies()).get(ZY_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.zy === true;
  } catch {
    return false;
  }
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
