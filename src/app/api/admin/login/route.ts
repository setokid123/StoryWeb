import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, adminCookieOptions, createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { consumeRateLimit, rateLimitKey, resetRateLimit } from "@/lib/rate-limit";
import { clientIp, rateLimited, unavailable } from "@/lib/request-guard";

// Legacy ADMIN_PANEL_PASSWORD login, still used by /panel in production. Contract: `{ password }` → `{ ok: true }` + cookie.
export async function POST(request: Request) {
  if (!adminConfigured()) return NextResponse.json({ error: "Panel chưa được cấu hình.", code: "not_configured" }, { status: 503 });
  const body: unknown = await request.json().catch(() => null);
  const password = typeof body === "object" && body !== null && "password" in body ? body.password : undefined;
  const key = rateLimitKey("admin-login-ip", clientIp(request));
  try {
    const limit = await consumeRateLimit([{ key, limit: 10, windowSeconds: 15 * 60 }]);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  } catch (error) {
    return unavailable(error);
  }
  if (typeof password !== "string" || password.length > 256 || !verifyAdminPassword(password)) return NextResponse.json({ error: "Mật khẩu không đúng.", code: "invalid_credentials" }, { status: 401 });
  await resetRateLimit(key).catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(), adminCookieOptions);
  return response;
}
