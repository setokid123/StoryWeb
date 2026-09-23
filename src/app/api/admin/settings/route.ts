import { NextResponse } from "next/server";
import { buildAdminSettingsPayload, parseSettingsUpdate } from "@/lib/admin-settings";
import { getAdminAccess } from "@/lib/cms-access";
import { apiError, crossOrigin, isSameOriginRequest, readJsonObject, unavailable } from "@/lib/request-guard";
import { getSiteSettings, saveSiteSettings, SettingsConflictError } from "@/lib/site-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function denied(status: 401 | 403) {
  return status === 401 ? apiError(401, "unauthenticated", "Chưa đăng nhập.") : apiError(403, "forbidden", "Chỉ quản trị viên được xem và sửa cài đặt quảng cáo & mở khóa.");
}

/** GET /api/admin/settings → AdminSettingsPayload (admin only). */
export async function GET() {
  const access = await getAdminAccess();
  if (!access.ok) return denied(access.status);
  const settings = await getSiteSettings();
  if (settings.unavailable) return apiError(503, "unavailable", "Không đọc được cấu hình. Kiểm tra cơ sở dữ liệu/migration.");
  return NextResponse.json(await buildAdminSettingsPayload(), { headers: { "Cache-Control": "no-store" } });
}

/** PUT /api/admin/settings with AdminSettingsUpdate → AdminSettingsPayload; 409 on version conflict or mode not ready. */
export async function PUT(request: Request) {
  if (!isSameOriginRequest(request)) return crossOrigin();
  const access = await getAdminAccess();
  if (!access.ok) return denied(access.status);
  const body = await readJsonObject(request, 4 * 1024);
  if (body === "too_large") return apiError(413, "payload_too_large", "Dữ liệu gửi lên quá lớn.");
  if (!body) return apiError(400, "invalid_input", "Dữ liệu không hợp lệ.");
  const current = await getSiteSettings();
  if (current.unavailable) return apiError(503, "unavailable", "Không đọc được cấu hình. Kiểm tra cơ sở dữ liệu/migration.");
  const parsed = parseSettingsUpdate(body, current);
  if (!parsed.ok) return apiError(parsed.status, parsed.code, parsed.error, { fields: parsed.fields });
  try {
    const { version, ...update } = parsed.value;
    const saved = await saveSiteSettings(update, access.actor, version);
    return NextResponse.json(await buildAdminSettingsPayload(saved), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SettingsConflictError) return apiError(409, "conflict", error.message);
    return unavailable(error);
  }
}
