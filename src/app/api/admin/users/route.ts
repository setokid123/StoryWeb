import { NextResponse } from "next/server";
import { createUser, isUserRole, listUsers, normalizeDisplayName, normalizeEmail, passwordProblem } from "@/lib/auth";
import { getAdminAccess } from "@/lib/cms-access";
import { apiError, crossOrigin, isSameOriginRequest, readJsonObject, unavailable } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function denied(status: 401 | 403) {
  return status === 401 ? apiError(401, "unauthenticated", "Chưa đăng nhập.") : apiError(403, "forbidden", "Chỉ quản trị viên được quản lý tài khoản.");
}

/** GET /api/admin/users?role=editor&q=abc&limit=50&offset=0 */
export async function GET(request: Request) {
  const access = await getAdminAccess();
  if (!access.ok) return denied(access.status);
  const params = new URL(request.url).searchParams;
  const role = params.get("role");
  if (role !== null && !isUserRole(role)) return apiError(400, "invalid_input", "Vai trò không hợp lệ.");
  const query = (params.get("q") ?? "").trim().slice(0, 100);
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.get("limit") ?? "50", 10) || 50));
  const offset = Math.max(0, Number.parseInt(params.get("offset") ?? "0", 10) || 0);
  try {
    return NextResponse.json({ users: await listUsers({ role: role ?? undefined, query: query || undefined, limit, offset }), limit, offset }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return unavailable(error);
  }
}

/** Admin-created accounts (e.g. editors). Body: `{ email, displayName, password, role }`. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return crossOrigin();
  const access = await getAdminAccess();
  if (!access.ok) return denied(access.status);
  const body = await readJsonObject(request);
  if (body === "too_large") return apiError(413, "payload_too_large", "Dữ liệu gửi lên quá lớn.");
  if (!body) return apiError(400, "invalid_input", "Dữ liệu không hợp lệ.");
  const email = normalizeEmail(body.email);
  const displayName = normalizeDisplayName(body.displayName);
  const passwordIssue = passwordProblem(body.password);
  const fields: Record<string, string> = {};
  if (!email) fields.email = "Email không hợp lệ.";
  if (!displayName) fields.displayName = "Tên hiển thị cần từ 1 đến 100 ký tự.";
  if (passwordIssue) fields.password = passwordIssue;
  if (!isUserRole(body.role)) fields.role = "Vai trò phải là reader, editor hoặc admin.";
  if (!email || !displayName || passwordIssue || !isUserRole(body.role)) return apiError(400, "invalid_input", "Vui lòng kiểm tra lại thông tin tài khoản.", { fields });
  try {
    const user = await createUser({ email, displayName, password: body.password as string, role: body.role });
    if (user === "email_taken") return apiError(409, "email_unavailable", "Email đã được dùng cho tài khoản khác.", { fields: { email: "Email đã được dùng." } });
    return NextResponse.json({ user }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return unavailable(error);
  }
}
