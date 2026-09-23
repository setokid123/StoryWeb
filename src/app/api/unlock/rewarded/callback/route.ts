import { NextResponse } from "next/server";
import { getRewardedProvider } from "@/lib/rewarded-providers";
import { apiError, readJsonObject, unavailable } from "@/lib/request-guard";
import { markChallengeVerified } from "@/lib/unlock-challenges";

export const runtime = "nodejs";

/**
 * Server-to-server completion callback from the rewarded provider. Browsers must not be able to fake this:
 * the provider adapter verifies a signature over the StoryWeb nonce and the provider's transaction id.
 * No Origin check (the caller is the provider), no cookies used.
 */
export async function POST(request: Request) {
  const provider = getRewardedProvider();
  if (provider.readiness.state !== "ready") return apiError(503, "unavailable", "Nhà cung cấp chưa sẵn sàng.");
  const body = await readJsonObject(request, 4 * 1024);
  if (body === "too_large") return apiError(413, "payload_too_large", "Dữ liệu gửi lên quá lớn.");
  if (!body) return apiError(400, "invalid_input", "Dữ liệu không hợp lệ.");
  const verified = provider.verifyCallback(body);
  if (!verified.ok) return apiError(401, "invalid_credentials", "Chữ ký callback không hợp lệ.");
  try {
    const result = await markChallengeVerified(provider.id, verified.nonce, verified.providerRef);
    if (result === "rejected") return apiError(409, "invalid_input", "Challenge không tồn tại, đã hết hạn hoặc đã dùng.");
    return NextResponse.json({ ok: true, status: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return unavailable(error);
  }
}
