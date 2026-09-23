"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdSlotFlags } from "@/lib/ad-placements";
import type { AdminSettingsPayload, AdminSettingsUpdate, Readiness } from "@/lib/settings-contract";
import { UnlockSettingsView } from "@/components/unlock-settings-view";

type Draft = { enabled: boolean; mode: "link" | "rewarded"; linkUrl: string; slots: AdSlotFlags };

function draftFrom(payload: AdminSettingsPayload): Draft {
  return { enabled: payload.settings.unlockEnabled, mode: payload.settings.unlockMode, linkUrl: payload.settings.unlockLinkUrl ?? "", slots: payload.settings.adSlots };
}

const MODE_LABEL = { off: "Tắt", link: "Nhấp liên kết", rewarded: "Xem quảng cáo có thưởng" } as const;

/**
 * Studio "Quảng cáo & mở khóa" container: owns draft state, PUT /api/admin/settings, pending/error/success and
 * version conflicts, and renders U4's UnlockSettingsView. The server re-validates everything on save.
 */
export function UnlockSettingsContainer({ initial }: { initial: AdminSettingsPayload }) {
  const [payload, setPayload] = useState(initial);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [linkError, setLinkError] = useState<string | undefined>();

  const saved = draftFrom(payload);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const linkChanged = draft.linkUrl.trim() !== saved.linkUrl;

  // U4's view blocks saving whenever the selected mode is not ready. Readiness only matters when unlock is being
  // enabled, and a newly typed link URL is validated by the server, so those cases are reported as savable.
  function viewReadiness(mode: "link" | "rewarded", readiness: Readiness) {
    const savable = readiness.state === "ready" || !draft.enabled || (mode === "link" && linkChanged && readiness.state === "unconfigured");
    return { isReady: savable, reason: readiness.reason ?? undefined };
  }

  function change(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
    setError(undefined);
    setSuccess(undefined);
    setLinkError(undefined);
  }

  async function reloadLatest() {
    const latest = await fetch("/api/admin/settings", { cache: "no-store" }).catch(() => null);
    if (latest?.ok) {
      const next = await latest.json() as AdminSettingsPayload;
      setPayload(next);
      setDraft(draftFrom(next));
    }
  }

  async function save() {
    if (pending) return;
    if (!dirty) { setSuccess("Không có thay đổi nào để lưu."); return; }
    setPending(true);
    setError(undefined);
    setSuccess(undefined);
    setLinkError(undefined);
    const body: AdminSettingsUpdate = { version: payload.settings.version, unlockEnabled: draft.enabled, unlockMode: draft.mode, unlockLinkUrl: draft.linkUrl.trim() || null, adSlots: draft.slots };
    try {
      const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      const json = await response.json().catch(() => ({})) as Record<string, unknown> & { fields?: Record<string, string> };
      if (response.ok) {
        const next = json as unknown as AdminSettingsPayload;
        const revoked = next.settings.unlockRevision !== payload.settings.unlockRevision;
        setPayload(next);
        setDraft(draftFrom(next));
        setSuccess(revoked ? "Đã lưu. Quyền đọc đã cấp theo cấu hình cũ hết hiệu lực ngay." : "Đã lưu cài đặt quảng cáo.");
        return;
      }
      if (response.status === 401) { setError("Phiên đăng nhập đã hết. Hãy đăng nhập lại."); return; }
      if (response.status === 403) { setError("Tài khoản không có quyền quản trị."); return; }
      if (response.status === 409 && json.code === "conflict") {
        setError(typeof json.error === "string" ? json.error : "Cấu hình đã thay đổi ở nơi khác.");
        await reloadLatest();
        return;
      }
      setError(typeof json.error === "string" ? json.error : "Không lưu được cài đặt. Vui lòng thử lại.");
      if (json.fields?.linkUrl) setLinkError(json.fields.linkUrl);
    } catch {
      setError("Mất kết nối mạng. Cài đặt chưa được lưu.");
    } finally {
      setPending(false);
    }
  }

  return <>
    <UnlockSettingsView
      isUnlockEnabled={draft.enabled}
      selectedMode={draft.mode}
      slotFlags={draft.slots}
      linkReadiness={viewReadiness("link", payload.readiness.link)}
      rewardedReadiness={viewReadiness("rewarded", payload.readiness.rewarded)}
      isSaving={pending}
      successMessage={success}
      errorMessage={error}
      onToggleUnlock={(enabled) => change({ enabled })}
      onChangeMode={(mode) => change({ mode })}
      onToggleSlot={(slot, enabled) => change({ slots: { ...draft.slots, [slot]: enabled } })}
      onSave={() => void save()}
    />
    {/* Container-owned details not covered by U4's view yet (link URL, effective state, audit). */}
    <section className="settings-section" aria-labelledby="unlock-details-title">
      <div className="settings-section__header"><h2 id="unlock-details-title">Chi tiết mở khóa</h2></div>
      <div className="settings-section__body">
        <p className="settings-hint">Đang áp dụng cho người đọc: <strong>{MODE_LABEL[payload.effectiveMode]}</strong>{payload.emergencyOff ? " (máy chủ đang tạm dừng mở khóa)" : ""} · revision {payload.settings.unlockRevision} · mỗi lượt mở {payload.accessMinutes} phút.</p>
        <label htmlFor="unlock-link-url"><strong>URL liên kết</strong></label>
        <input id="unlock-link-url" type="url" inputMode="url" value={draft.linkUrl} onChange={(event) => change({ linkUrl: event.target.value })} disabled={pending} placeholder={payload.envLinkUrlConfigured ? "Để trống để dùng CLICK_UNLOCK_URL trên máy chủ" : "https://"} aria-invalid={Boolean(linkError)} aria-describedby="unlock-link-help" />
        <p id="unlock-link-help" className="settings-hint">Chỉ nhận https. Liên kết Shopee/đối tác thật cần chấp thuận riêng trên máy chủ. Nhấp liên kết chỉ xác nhận người đọc đã bấm nút trên StoryWeb, không xác nhận đã xem trang đích hay mua hàng.</p>
        {linkError && <p className="form-error-inline" role="alert">{linkError}</p>}
        <p className="settings-hint">Quảng cáo hiển thị: {payload.display.state === "ready" ? `sẵn sàng (${payload.display.provider})` : payload.display.reason}</p>
        {!draft.enabled && <p className="settings-hint">Trạng thái sẵn sàng của từng phương thức chỉ được kiểm tra khi bật mở khóa.</p>}
        <p className="settings-hint">{payload.settings.updatedAt ? `Cập nhật ${new Date(payload.settings.updatedAt).toLocaleString("vi-VN")} bởi ${payload.settings.updatedBy ?? "không rõ"}.` : "Chưa từng lưu."} {dirty && <button type="button" className="button button--ghost" onClick={() => { setDraft(saved); setError(undefined); setSuccess(undefined); setLinkError(undefined); }} disabled={pending}>Hoàn tác thay đổi</button>}</p>
        <p><Link href="/panel">← Về Studio</Link></p>
      </div>
    </section>
  </>;
}
