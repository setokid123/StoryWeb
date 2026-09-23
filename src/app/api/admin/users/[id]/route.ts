import { NextResponse } from "next/server";
import { isUserRole, normalizeDisplayName, passwordProblem, revokeUserSessions, updateUser, uuidPattern, type UserRole } from "@/lib/auth";
import { getAdminAccess } from "@/lib/cms-access";
import { apiError, crossOrigin, isSameOriginRequest, readJsonObject, unavailable } from "@/lib/request-guard";

export const runtime = "nodejs";

/**
 * Admin update of another account: `{ role?, displayName?, password? }`.
 * A role change or password reset signs the user out everywhere.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return crossOrigin();
  const access = await getAdminAccess();
  if (!access.ok) return access.status === 401 ? apiError(401, "unauthenticated", "Chưa đăng nhập.") : apiError(403, "forbidden", "Chỉ quản trị viên được quản lý tài khoản.");
  const { id } = await params;
  if (!uuidPattern.test(id)) return apiError(404, "not_found", "Không tìm thấy tài khoản.");
  const body = await readJsonObject(request);
  if (body === "too_large") return apiError(413, "payload_too_large", "Dữ liệu gửi lên quá lớn.");
  if (!body) return apiError(400, "invalid_input", "Dữ liệu không hợp lệ.");

  const fields: Record<string, string> = {};
  const changes: { role?: UserRole; displayName?: string; password?: string } = {};
  if (body.role !== undefined) {
    if (!isUserRole(body.role)) fields.role = "Vai trò phải là reader, editor hoặc admin.";
    else if (access.actor.userId === id) fields.role = "Không thể tự đổi vai trò của chính mình.";
    else changes.role = body.role;
  }
  if (body.displayName !== undefined) {
    const displayName = normalizeDisplayName(body.displayName);
    if (displayName) changes.displayName = displayName;
    else fields.displayName = "Tên hiển thị cần từ 1 đến 100 ký tự.";
  }
  if (body.password !== undefined) {
    const issue = passwordProblem(body.password);
    if (issue) fields.password = issue;
    else changes.password = body.password as string;
  }
  if (Object.keys(fields).length) return apiError(400, "invalid_input", "Vui lòng kiểm tra lại thông tin.", { fields });
  if (!Object.keys(changes).length) return apiError(400, "invalid_input", "Không có thay đổi nào.");

  try {
    const user = await updateUser(id, changes);
    if (!user) return apiError(404, "not_found", "Không tìm thấy tài khoản.");
    if (changes.role !== undefined || changes.password !== undefined) await revokeUserSessions(id);
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return unavailable(error);
  }
}
