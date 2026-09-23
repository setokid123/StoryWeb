import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/cms-access";
import { ManagedStoryError, setManagedStoryOwner } from "@/lib/managed-stories";
import { apiError, crossOrigin, isSameOriginRequest, readJsonObject, unavailable } from "@/lib/request-guard";

export const runtime = "nodejs";

/** Admin-only: `{ storyId, ownerId }` assigns a story to an editor/admin account; `ownerId: null` returns it to admin management. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return crossOrigin();
  const access = await getAdminAccess();
  if (!access.ok) return access.status === 401 ? apiError(401, "unauthenticated", "Chưa đăng nhập.") : apiError(403, "forbidden", "Chỉ quản trị viên được đổi chủ sở hữu truyện.");
  const body = await readJsonObject(request);
  if (body === "too_large") return apiError(413, "payload_too_large", "Dữ liệu gửi lên quá lớn.");
  if (!body || typeof body.storyId !== "string" || (body.ownerId !== null && typeof body.ownerId !== "string")) return apiError(400, "invalid_input", "Cần storyId và ownerId (hoặc null).");
  try {
    return NextResponse.json({ story: await setManagedStoryOwner(body.storyId, body.ownerId as string | null) });
  } catch (error) {
    if (error instanceof ManagedStoryError) return apiError(error.status, error.status === 404 ? "not_found" : error.status === 403 ? "forbidden" : "invalid_input", error.message);
    return unavailable(error);
  }
}
