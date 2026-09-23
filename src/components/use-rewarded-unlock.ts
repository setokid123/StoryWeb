"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RewardedViewState } from "@/components/view-contracts";

type ShowResult = "completed" | "closed" | "no_fill" | "error";

/**
 * Client side of a rewarded provider: shows the ad and reports how it ended. "completed" is only a hint to start
 * claiming — access is granted solely by the server after the provider's signed callback.
 */
type ClientRewardedAdapter = (config: Record<string, string>, nonce: string) => Promise<ShowResult>;

const adapters: Record<string, ClientRewardedAdapter> = {
  // Dev/test: asks the server to play the provider callback. The route 404s outside dev/test.
  async mock(_config, nonce) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const response = await fetch("/api/unlock/rewarded/mock-complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nonce }) });
    return response.ok ? "completed" : "error";
  },
};

async function post(path: string, body?: unknown) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const json = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { status: response.status, json };
}

const MESSAGES: Record<Exclude<RewardedViewState, "ready" | "granted">, string> = {
  unconfigured: "Chưa cấu hình quảng cáo có thưởng.",
  pending: "Đang tải quảng cáo… Quyền đọc chỉ được mở sau khi nhà cung cấp xác nhận bạn đã xem xong.",
  unavailable: "Hiện không có quảng cáo phù hợp. Vui lòng thử lại sau.",
  failed: "Quảng cáo chưa hoàn thành nên chưa mở được chương. Bạn có thể thử lại.",
};

export function useRewardedUnlock(enabled: boolean, onGranted: () => void) {
  const [state, setState] = useState<RewardedViewState>("ready");
  const [message, setMessage] = useState<string | null>(null);
  const nonceRef = useRef<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => () => { cancelled.current = true; }, []);

  const fail = useCallback((next: "failed" | "unavailable", text?: string) => {
    const nonce = nonceRef.current;
    nonceRef.current = null;
    if (nonce) void post("/api/unlock/rewarded/cancel", { nonce });
    setState(next);
    setMessage(text ?? MESSAGES[next]);
  }, []);

  const claim = useCallback(async (nonce: string) => {
    // The provider callback may arrive slightly after the ad closes: poll briefly.
    for (let attempt = 0; attempt < 15 && !cancelled.current; attempt += 1) {
      const { status, json } = await post("/api/unlock/rewarded/claim", { nonce });
      if (status === 200 && json.status === "granted") {
        nonceRef.current = null;
        setState("granted");
        setMessage("Đã mở quyền đọc trong 5 phút.");
        onGranted();
        return;
      }
      if (status !== 202) return fail("failed", typeof json.error === "string" ? json.error : undefined);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    fail("failed", "Chưa nhận được xác nhận từ nhà cung cấp quảng cáo. Vui lòng thử lại.");
  }, [fail, onGranted]);

  const onWatch = useCallback(async () => {
    if (!enabled || state === "pending") return;
    setState("pending");
    setMessage(MESSAGES.pending);
    try {
      const { status, json } = await post("/api/unlock/rewarded/start");
      if (status !== 200 || typeof json.nonce !== "string") return fail(status === 429 || status === 503 ? "unavailable" : "failed", typeof json.error === "string" ? json.error : undefined);
      const nonce = json.nonce;
      nonceRef.current = nonce;
      const config = (json.provider ?? {}) as Record<string, string>;
      const adapter = adapters[config.provider ?? ""];
      if (!adapter) return fail("unavailable");
      const result = await adapter(config, nonce);
      if (cancelled.current) return;
      if (result === "completed") return await claim(nonce);
      fail(result === "no_fill" ? "unavailable" : "failed");
    } catch {
      fail("failed", "Mất kết nối. Vui lòng thử lại.");
    }
  }, [enabled, state, claim, fail]);

  const onCancel = useCallback(() => fail("failed", "Bạn đã đóng quảng cáo trước khi hoàn thành."), [fail]);

  return { state, message, onWatch, onCancel };
}
