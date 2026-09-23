import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, adminCookieOptions, createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!adminConfigured()) return NextResponse.json({ error: "Panel chưa được cấu hình." }, { status: 503 });
  const body: unknown = await request.json().catch(() => null);
  const password = typeof body === "object" && body !== null && "password" in body ? body.password : undefined;
  if (typeof password !== "string" || password.length > 256 || !verifyAdminPassword(password)) return NextResponse.json({ error: "Mật khẩu không đúng." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(), adminCookieOptions);
  return response;
}
