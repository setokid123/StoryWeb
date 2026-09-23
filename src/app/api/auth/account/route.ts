import { NextResponse } from "next/server";
import { getCurrentSession, normalizeDisplayName, passwordProblem, revokeUserSessions, updateUser, verifyUserPassword } from "@/lib/auth";
import { consumeRateLimit, rateLimitKey, resetRateLimit } from "@/lib/rate-limit";
import { apiError, crossOrigin, isSameOriginRequest, rateLimited, readJsonObject, unavailable } from "@/lib/request-guard";

export const runtime = "nodejs";

/**
 * Self-service profile update: `{ displayName? , currentPassword?, newPassword? }`.
 * Changing the password requires the current one and signs out every other session.
 * Role and email cannot be changed here.
 */
export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return crossOrigin();
  const body = await readJsonObject(request);
  if (body === "too_large") return apiError(413, "payload_too_large", "Dữ liệu gửi lên quá lớn.");
  if (!body) return apiError(400, "invalid_input", "Dữ liệu không hợp lệ.");

  try {
    const session = await getCurrentSession();
    if (!session) return apiError(401, "unauthenticated", "Chưa đăng nhập.");

    const fields: Record<string, string> = {};
    const changes: { displayName?: string; password?: string } = {};
    if (body.displayName !== undefined) {
      const displayName = normalizeDisplayName(body.displayName);
      if (displayName) changes.displayName = displayName;
      else fields.displayName = "Tên hiển thị cần từ 1 đến 100 ký tự.";
    }
    if (body.newPassword !== undefined) {
      const issue = passwordProblem(body.newPassword);
      if (issue) fields.newPassword = issue;
      else if (typeof body.currentPassword !== "string" || body.currentPassword.length > 256) fields.currentPassword = "Nhập mật khẩu hiện tại.";
      else changes.password = body.newPassword as string;
    }
    if (Object.keys(fields).length) return apiError(400, "invalid_input", "Vui lòng kiểm tra lại thông tin.", { fields });
    if (changes.displayName === undefined && changes.password === undefined) return apiError(400, "invalid_input", "Không có thay đổi nào.");

    if (changes.password !== undefined) {
      const key = rateLimitKey("password-change", session.user.id);
      const limit = await consumeRateLimit([{ key, limit: 5, windowSeconds: 15 * 60 }]);
      if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
      if (!await verifyUserPassword(session.user.id, body.currentPassword as string)) {
        return apiError(400, "invalid_credentials", "Mật khẩu hiện tại không đúng.", { fields: { currentPassword: "Mật khẩu hiện tại không đúng." } });
      }
      await resetRateLimit(key);
    }
    const user = await updateUser(session.user.id, changes);
    if (!user) return apiError(401, "unauthenticated", "Chưa đăng nhập.");
    if (changes.password !== undefined) await revokeUserSessions(user.id, session.tokenHash);
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return unavailable(error);
  }
}
