"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RewardedViewState } from "@/components/view-contracts";
import { type FlowDeps, runRewardedFlow, type ShowResult } from "@/lib/rewarded-flow";

/** Client SDK adapters keyed by `provider` from /api/unlock/rewarded/start. Only mock exists (dev/test). */
const adapters: Record<string, (config: Record<string, string>, nonce: string) => Promise<ShowResult>> = {
  // The route 404s outside dev/test, which ends as "error" → no grant.
  async mock(_config, nonce) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const response = await fetch("/api/unlock/rewarded/mock-complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nonce }) });
    return response.ok ? "completed" : "error";
  },
};

async function post(path: string, body?: unknown) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}), cache: "no-store" });
  const json = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { status: response.status, json };
}

export function useRewardedUnlock(enabled: boolean, onGranted: () => void) {
  const [state, setState] = useState<RewardedViewState>("ready");
  const [message, setMessage] = useState<string | null>(null);
  const cancelled = useRef(false);
  const running = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => { cancelled.current = true; };
  }, []);

  const onWatch = useCallback(async () => {
    if (!enabled || running.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setState("failed");
      setMessage("Mất kết nối mạng. Kiểm tra kết nối rồi thử lại.");
      return;
    }
    running.current = true;
    setState("pending");
    setMessage("Đang tải quảng cáo… Quyền đọc chỉ được mở sau khi nhà cung cấp xác nhận bạn đã xem xong.");
    const deps: FlowDeps = {
      post,
      show: (config, nonce) => adapters[config.provider ?? ""]?.(config, nonce) ?? null,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      isCancelled: () => cancelled.current,
    };
    const outcome = await runRewardedFlow(deps);
    running.current = false;
    if (cancelled.current) return;
    setState(outcome.state);
    setMessage(outcome.message);
    if (outcome.state === "granted") onGranted();
  }, [enabled, onGranted]);

  return { state, message, onWatch };
}
