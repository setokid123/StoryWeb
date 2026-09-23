import { NextResponse } from "next/server";
import { authenticate, createSession, normalizeEmail, setSessionCookie } from "@/lib/auth";
import { PASSWORD_MAX_LENGTH } from "@/lib/password";
import { consumeRateLimit, rateLimitKey, resetRateLimit } from "@/lib/rate-limit";
import { apiError, clientIp, crossOrigin, isSameOriginRequest, rateLimited, readJsonObject, unavailable } from "@/lib/request-guard";

export const runtime = "nodejs";

const INVALID = "Email hoặc mật khẩu không đúng.";
const WINDOW_SECONDS = 15 * 60;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return crossOrigin();
  const body = await readJsonObject(request);
  if (body === "too_large") return apiError(413, "payload_too_large", "Dữ liệu gửi lên quá lớn.");
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") return apiError(400, "invalid_input", "Vui lòng nhập email và mật khẩu.");
  const email = normalizeEmail(body.email);
  const password = body.password;
  // Malformed email or over-long password can never match: same response as a wrong password.
  if (!email || password.length === 0 || password.length > PASSWORD_MAX_LENGTH) return apiError(401, "invalid_credentials", INVALID);

  try {
    const emailKey = rateLimitKey("login-email", email);
    const limit = await consumeRateLimit([
      { key: emailKey, limit: 5, windowSeconds: WINDOW_SECONDS },
      { key: rateLimitKey("login-ip", clientIp(request)), limit: 30, windowSeconds: WINDOW_SECONDS },
    ]);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
    const user = await authenticate(email, password);
    if (!user) return apiError(401, "invalid_credentials", INVALID);
    await resetRateLimit(emailKey);
    const session = await createSession(user.id);
    const response = NextResponse.json({ user, expiresAt: session.expiresAt.toISOString() }, { headers: { "Cache-Control": "no-store" } });
    setSessionCookie(response, session);
    return response;
  } catch (error) {
    return unavailable(error);
  }
}
