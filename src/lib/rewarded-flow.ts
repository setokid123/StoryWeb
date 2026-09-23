// Pure rewarded-unlock state machine (no React/Next imports) so offline/provider-failure paths are unit-testable.
// The client never decides access: "completed" from an ad SDK only starts polling the server claim.

export type ShowResult = "completed" | "closed" | "no_fill" | "error";
export type FlowResponse = { status: number; json: Record<string, unknown> };

export type FlowDeps = {
  post: (path: string, body?: unknown) => Promise<FlowResponse>;
  /** Runs the provider's client SDK for this nonce. Missing adapter → treated as unavailable. */
  show: (provider: Record<string, string>, nonce: string) => Promise<ShowResult> | null;
  sleep: (ms: number) => Promise<void>;
  isCancelled?: () => boolean;
  pollAttempts?: number;
  pollIntervalMs?: number;
};

export type FlowOutcome =
  | { state: "granted"; message: string; expiresAt: string | null }
  | { state: "failed" | "unavailable"; message: string };

export const FLOW_MESSAGES = {
  granted: "Đã mở quyền đọc trong 5 phút.",
  unavailable: "Hiện không có quảng cáo phù hợp. Vui lòng thử lại sau.",
  failed: "Quảng cáo chưa hoàn thành nên chưa mở được chương. Bạn có thể thử lại.",
  closed: "Bạn đã đóng quảng cáo trước khi hoàn thành.",
  offline: "Mất kết nối mạng. Kiểm tra kết nối rồi thử lại.",
  noConfirmation: "Chưa nhận được xác nhận từ nhà cung cấp quảng cáo. Vui lòng thử lại.",
} as const;

function errorText(json: Record<string, unknown>, fallback: string) {
  return typeof json.error === "string" ? json.error : fallback;
}

export async function runRewardedFlow(deps: FlowDeps): Promise<FlowOutcome> {
  const attempts = deps.pollAttempts ?? 15;
  const interval = deps.pollIntervalMs ?? 1000;
  let nonce: string | null = null;
  // Best effort: burn the challenge so a late provider callback can never be claimed.
  const burn = async () => { if (nonce) await deps.post("/api/unlock/rewarded/cancel", { nonce }).catch(() => undefined); };

  try {
    const start = await deps.post("/api/unlock/rewarded/start");
    if (start.status !== 200 || typeof start.json.nonce !== "string") {
      return start.status === 429 || start.status === 503
        ? { state: "unavailable", message: errorText(start.json, FLOW_MESSAGES.unavailable) }
        : { state: "failed", message: errorText(start.json, FLOW_MESSAGES.failed) };
    }
    nonce = start.json.nonce;
    const provider = (start.json.provider ?? {}) as Record<string, string>;
    const showing = deps.show(provider, nonce);
    if (!showing) { await burn(); return { state: "unavailable", message: FLOW_MESSAGES.unavailable }; }
    const result: ShowResult = await showing.catch(() => "error" as const);
    if (result !== "completed") {
      await burn();
      return result === "no_fill" ? { state: "unavailable", message: FLOW_MESSAGES.unavailable }
        : { state: "failed", message: result === "closed" ? FLOW_MESSAGES.closed : FLOW_MESSAGES.failed };
    }
    // The provider's server callback may land shortly after the ad closes.
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (deps.isCancelled?.()) return { state: "failed", message: FLOW_MESSAGES.failed };
      const claim = await deps.post("/api/unlock/rewarded/claim", { nonce });
      if (claim.status === 200 && claim.json.status === "granted") {
        return { state: "granted", message: FLOW_MESSAGES.granted, expiresAt: typeof claim.json.expiresAt === "string" ? claim.json.expiresAt : null };
      }
      if (claim.status !== 202) { await burn(); return { state: "failed", message: errorText(claim.json, FLOW_MESSAGES.failed) }; }
      await deps.sleep(interval);
    }
    await burn();
    return { state: "failed", message: FLOW_MESSAGES.noConfirmation };
  } catch {
    await burn();
    return { state: "failed", message: FLOW_MESSAGES.offline };
  }
}
