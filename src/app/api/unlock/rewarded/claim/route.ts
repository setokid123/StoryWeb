import { NextResponse } from "next/server";
import { apiError, crossOrigin, isSameOriginRequest, readJsonObject, unavailable } from "@/lib/request-guard";
import { claimChallenge } from "@/lib/unlock-challenges";
import { currentReaderId, LEGACY_UNLOCK_COOKIE, mintUnlockGrant, readerHash, resolveUnlock, UNLOCK_COOKIE, unlockCookieOptions } from "@/lib/unlock";

export const runtime = "nodejs";

/**
 * Reader claims a verified challenge once. 200 `{ status: "granted", expiresAt }` + cookie,
 * 202 `{ status: "pending" }` while the provider callback has not arrived, 409 `{ code: "invalid_input" }` otherwise.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return crossOrigin();
  const body = await readJsonObject(request, 1024);
  if (body === "too_large" || !body || typeof body.nonce !== "string" || !/^[a-f0-9]{64}$/.test(body.nonce)) return apiError(400, "invalid_input", "Thiếu mã lượt xem quảng cáo.");
  const resolved = await resolveUnlock();
  if (resolved.mode !== "rewarded") return apiError(503, "unavailable", "Mở khóa bằng quảng cáo chưa được bật.");
  const readerId = await currentReaderId();
  if (!readerId) return apiError(409, "invalid_input", "Lượt xem quảng cáo không hợp lệ hoặc đã dùng.");
  try {
    const result = await claimChallenge(body.nonce, readerHash(readerId), resolved.revision);
    if (result === "pending") return NextResponse.json({ status: "pending" }, { status: 202, headers: { "Cache-Control": "no-store" } });
    if (result === "invalid") return apiError(409, "invalid_input", "Lượt xem quảng cáo không hợp lệ hoặc đã dùng.");
    const grant = mintUnlockGrant("rewarded", resolved.revision);
    const response = NextResponse.json({ status: "granted", expiresAt: new Date(grant.expiresAt).toISOString() }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(UNLOCK_COOKIE, grant.value, unlockCookieOptions);
    response.cookies.delete(LEGACY_UNLOCK_COOKIE);
    return response;
  } catch (error) {
    return unavailable(error);
  }
}
