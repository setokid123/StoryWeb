import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Rewarded-ad provider adapters. A provider may grant chapter access ONLY if its completion proof is verified on
 * this server (signed server-to-server callback) and bound to a StoryWeb nonce. A browser event such as Google Ad
 * Manager's `rewardedSlotGranted` is not proof: Google offers no server-side verification for rewarded web ads.
 */

export type ProviderReadiness = { state: "ready" | "unconfigured" | "unavailable"; reason: string | null };

export type VerifiedCompletion = { ok: true; nonce: string; providerRef: string } | { ok: false; reason: string };

export type RewardedProvider = {
  id: string;
  label: string;
  readiness: ProviderReadiness;
  /** Public, non-secret config the client SDK needs (never secrets). */
  clientConfig: Record<string, string>;
  verifyCallback(body: Record<string, unknown>): VerifiedCompletion;
};

const NONCE = /^[a-f0-9]{64}$/;

function unconfigured(id: string, reason: string, state: ProviderReadiness["state"] = "unconfigured"): RewardedProvider {
  return { id, label: id || "Chưa chọn", readiness: { state, reason }, clientConfig: {}, verifyCallback: () => ({ ok: false, reason: "provider_not_ready" }) };
}

/**
 * Dev/test only. Refuses to run in production builds unless explicitly allowed for local e2e tests, and never on
 * Railway. The "provider callback" is an HMAC over `nonce.providerRef` with REWARDED_MOCK_SECRET.
 */
function mockProvider(): RewardedProvider {
  const secret = process.env.REWARDED_MOCK_SECRET ?? "";
  const allowed = (process.env.NODE_ENV !== "production" || process.env.STORYWEB_ALLOW_MOCK_REWARDED === "1") && !process.env.RAILWAY_ENVIRONMENT && !process.env.RAILWAY_PROJECT_ID;
  if (!allowed) return unconfigured("mock", "Nhà cung cấp mock chỉ dùng cho dev/test, không dùng trên production.", "unavailable");
  if (secret.length < 32) return unconfigured("mock", "Thiếu REWARDED_MOCK_SECRET (ít nhất 32 ký tự).");
  return {
    id: "mock",
    label: "Mock (dev/test)",
    readiness: { state: "ready", reason: null },
    clientConfig: { provider: "mock" },
    verifyCallback(body) {
      const { nonce, providerRef, signature } = body;
      if (typeof nonce !== "string" || !NONCE.test(nonce) || typeof providerRef !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/.test(providerRef) || typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature)) {
        return { ok: false, reason: "malformed" };
      }
      const expected = Buffer.from(createHmac("sha256", secret).update(`${nonce}.${providerRef}`).digest("hex"), "hex");
      const actual = Buffer.from(signature, "hex");
      return expected.length === actual.length && timingSafeEqual(expected, actual) ? { ok: true, nonce, providerRef } : { ok: false, reason: "bad_signature" };
    },
  };
}

export function getRewardedProvider(): RewardedProvider {
  const id = (process.env.REWARDED_AD_PROVIDER ?? "").trim().toLowerCase();
  if (!id) return unconfigured("", "Chưa chọn nhà cung cấp quảng cáo có thưởng cho web có xác minh phía server.");
  if (id === "mock") return mockProvider();
  if (id === "google_ad_manager" || id === "gam" || id === "adsense") {
    return unconfigured(id, "Google chưa có xác minh phía server cho quảng cáo có thưởng trên web, nên không thể cấp quyền đọc.", "unavailable");
  }
  return unconfigured(id, `Nhà cung cấp "${id}" chưa có adapter xác minh phía server.`);
}

/** Test helper mirror of the mock signature (used by scripts/test-m2.mjs through the same formula). */
export function mockCallbackSignature(nonce: string, providerRef: string) {
  return createHmac("sha256", process.env.REWARDED_MOCK_SECRET ?? "").update(`${nonce}.${providerRef}`).digest("hex");
}
