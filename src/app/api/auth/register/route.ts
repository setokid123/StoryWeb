import { NextResponse } from "next/server";
import { createSession, createUser, normalizeDisplayName, normalizeEmail, passwordProblem, setSessionCookie } from "@/lib/auth";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { apiError, clientIp, crossOrigin, isSameOriginRequest, rateLimited, readJsonObject, unavailable } from "@/lib/request-guard";

export const runtime = "nodejs";

/** Public sign-up always creates a `reader`; any role field in the body is ignored. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return crossOrigin();
  const body = await readJsonObject(request);
  if (body === "too_large") return apiError(413, "payload_too_large", "Dữ liệu gửi lên quá lớn.");
  if (!body) return apiError(400, "invalid_input", "Dữ liệu không hợp lệ.");

  const email = normalizeEmail(body.email);
  const displayName = normalizeDisplayName(body.displayName);
  const fields: Record<string, string> = {};
  if (!email) fields.email = "Email không hợp lệ.";
  if (!displayName) fields.displayName = "Tên hiển thị cần từ 1 đến 100 ký tự.";
  const passwordIssue = passwordProblem(body.password);
  if (passwordIssue) fields.password = passwordIssue;
  if (!email || !displayName || passwordIssue) return apiError(400, "invalid_input", "Vui lòng kiểm tra lại thông tin đăng ký.", { fields });

  try {
    const limit = await consumeRateLimit([{ key: rateLimitKey("register-ip", clientIp(request)), limit: 10, windowSeconds: 60 * 60 }]);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
    const user = await createUser({ email, displayName, password: body.password as string, role: "reader" });
    if (user === "email_taken") return apiError(409, "email_unavailable", "Không thể đăng ký bằng email này. Hãy đăng nhập hoặc dùng email khác.", { fields: { email: "Email không khả dụng." } });
    const session = await createSession(user.id);
    const response = NextResponse.json({ user, expiresAt: session.expiresAt.toISOString() }, { status: 201, headers: { "Cache-Control": "no-store" } });
    setSessionCookie(response, session);
    return response;
  } catch (error) {
    return unavailable(error);
  }
}
