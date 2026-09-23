import { NextResponse } from "next/server";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { apiError, clientIp, crossOrigin, isSameOriginRequest, rateLimited, unavailable } from "@/lib/request-guard";
import { createChallenge } from "@/lib/unlock-challenges";
import { currentReaderId, newReaderId, READER_COOKIE, readerCookieOptions, readerHash, resolveUnlock } from "@/lib/unlock";

export const runtime = "nodejs";

/**
 * Starts one rewarded attempt: returns a nonce the client passes to the provider SDK as custom data. Access is
 * granted only after the provider's signed server callback verifies this nonce and the same reader claims it.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return crossOrigin();
  const resolved = await resolveUnlock();
  if (resolved.mode !== "rewarded") return apiError(503, "unavailable", "Mở khóa bằng quảng cáo chưa được bật.");
  try {
    const existing = await currentReaderId();
    const readerId = existing ?? newReaderId();
    const limit = await consumeRateLimit([
      { key: rateLimitKey("rewarded-reader", readerId), limit: 20, windowSeconds: 10 * 60 },
      { key: rateLimitKey("rewarded-ip", clientIp(request)), limit: 60, windowSeconds: 10 * 60 },
    ]);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
    const challenge = await createChallenge(resolved.provider.id, readerHash(readerId), resolved.revision);
    const response = NextResponse.json({ nonce: challenge.nonce, expiresAt: challenge.expiresAt.toISOString(), revision: resolved.revision, provider: resolved.provider.clientConfig }, { headers: { "Cache-Control": "no-store" } });
    if (!existing) response.cookies.set(READER_COOKIE, readerId, readerCookieOptions);
    return response;
  } catch (error) {
    return unavailable(error);
  }
}
