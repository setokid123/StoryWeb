import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";
import { clearSessionCookie, revokeCurrentSession } from "@/lib/auth";

// The Studio "Đăng xuất" button calls this route, so it also ends an account session if one is present.
export async function POST() {
  await revokeCurrentSession().catch((error: unknown) => console.error("Session revoke failed", error instanceof Error ? error.message : "unknown error"));
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE);
  clearSessionCookie(response);
  return response;
}
