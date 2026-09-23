import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getRewardedProvider, mockCallbackSignature } from "@/lib/rewarded-providers";
import { apiError, crossOrigin, isSameOriginRequest, readJsonObject, unavailable } from "@/lib/request-guard";
import { markChallengeVerified } from "@/lib/unlock-challenges";

export const runtime = "nodejs";

/**
 * DEV/TEST ONLY: plays the provider's server callback for the mock provider so the UI flow can be exercised locally.
 * Returns 404 unless the mock provider is ready, which it never is in production/Railway.
 */
export async function POST(request: Request) {
  const provider = getRewardedProvider();
  if (provider.id !== "mock" || provider.readiness.state !== "ready") return apiError(404, "not_found", "Không tìm thấy.");
  if (!isSameOriginRequest(request)) return crossOrigin();
  const body = await readJsonObject(request, 1024);
  if (body === "too_large" || !body || typeof body.nonce !== "string" || !/^[a-f0-9]{64}$/.test(body.nonce)) return apiError(400, "invalid_input", "Thiếu nonce.");
  const providerRef = `mock-${randomUUID()}`;
  const verified = provider.verifyCallback({ nonce: body.nonce, providerRef, signature: mockCallbackSignature(body.nonce, providerRef) });
  if (!verified.ok) return apiError(400, "invalid_input", "Mock callback thất bại.");
  try {
    const result = await markChallengeVerified(provider.id, verified.nonce, verified.providerRef);
    return result === "rejected" ? apiError(409, "invalid_input", "Challenge không hợp lệ.") : NextResponse.json({ ok: true });
  } catch (error) {
    return unavailable(error);
  }
}
