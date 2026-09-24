"use client";

import { useState } from "react";
import type { AdSlotFlags } from "@/lib/ad-placements";
import type { AdminSettingsPayload, AdminSettingsUpdate } from "@/lib/settings-contract";
import { normalizeUnlockLinkUrl } from "@/lib/unlock-link";
import { UnlockSettingsView } from "@/components/unlock-settings-view";

type Draft = { enabled: boolean; mode: "link" | "rewarded"; linkUrl: string; slots: AdSlotFlags };

function draftFrom(payload: AdminSettingsPayload): Draft {
  return { enabled: payload.settings.unlockEnabled, mode: payload.settings.unlockMode, linkUrl: payload.settings.unlockLinkUrl ?? "", slots: payload.settings.adSlots };
}

/** Draft state and API errors live here; the server rechecks readiness and permissions on every save. */
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
    if (pending || !dirty) return;
    setPending(true);
    setError(undefined);
    setSuccess(undefined);
    setLinkError(undefined);
    const typedUrl = draft.linkUrl.trim();
    if (typedUrl) {
      // Same normalizer as the server. Shopee approval is a server-only flag, so the server decides that case.
      const check = normalizeUnlockLinkUrl(typedUrl, { shopeeApproved: true });
      if (!check.ok) {
        setLinkError(check.reason);
        setError("URL liên kết chưa hợp lệ. Cài đặt chưa được lưu.");
        setPending(false);
        return;
      }
    }
    const body: AdminSettingsUpdate = {
      version: payload.settings.version,
      unlockEnabled: draft.enabled,
      unlockMode: draft.mode,
      unlockLinkUrl: draft.linkUrl.trim() || null,
      adSlots: draft.slots,
    };
    try {
      const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      const json = await response.json().catch(() => ({})) as Record<string, unknown> & { fields?: Record<string, string> };
      if (response.ok) {
        const next = json as unknown as AdminSettingsPayload;
        const revoked = next.settings.unlockRevision !== payload.settings.unlockRevision;
        setPayload(next);
        setDraft(draftFrom(next));
        setSuccess(revoked ? "Đã lưu. Quyền đọc đã cấp theo cấu hình cũ hết hiệu lực ngay." : "Đã lưu cài đặt.");
        return;
      }
      if (response.status === 401) { setError("Phiên đăng nhập đã hết. Hãy đăng nhập lại."); return; }
      if (response.status === 403) { setError("Tài khoản không có quyền quản trị."); return; }
      if (response.status === 409 && json.code === "conflict") {
        setError(typeof json.error === "string" ? json.error : "Cấu hình đã thay đổi ở nơi khác.");
        await reloadLatest();
        return;
      }
      if (response.status === 409 && json.code === "mode_not_ready") {
        // The draft is kept. A URL problem is shown on the field; a server-side condition (flag, secret, provider)
        // cannot be fixed here, so saving with the switch off is the way to keep the URL and ad slots.
        const reason = typeof json.error === "string" ? json.error : "Phương thức chưa sẵn sàng.";
        if (json.fields?.linkUrl) {
          setLinkError(json.fields.linkUrl);
          setError(`Chưa bật được Nhấp liên kết: ${json.fields.linkUrl}`);
        } else {
          setError(reason + " Tắt công tắc để lưu link và vị trí quảng cáo trước.");
        }
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

  return <UnlockSettingsView
    isUnlockEnabled={draft.enabled}
    selectedMode={draft.mode}
    effectiveMode={payload.effectiveMode}
    emergencyOff={payload.emergencyOff}
    accessMinutes={payload.accessMinutes}
    linkUrl={draft.linkUrl}
    linkError={linkError}
    linkIsEdited={linkChanged}
    envLinkUrlConfigured={payload.envLinkUrlConfigured}
    slotFlags={draft.slots}
    linkReadiness={payload.readiness.link}
    rewardedReadiness={payload.readiness.rewarded}
    display={payload.display}
    hasChanges={dirty}
    isSaving={pending}
    successMessage={success}
    errorMessage={error}
    updatedAt={payload.settings.updatedAt}
    updatedBy={payload.settings.updatedBy}
    onToggleUnlock={(enabled) => change({ enabled })}
    onChangeMode={(mode) => change({ mode })}
    onChangeLinkUrl={(linkUrl) => change({ linkUrl })}
    onUseTestLink={() => change({ linkUrl: "https://example.com/" })}
    onToggleSlot={(slot, enabled) => change({ slots: { ...draft.slots, [slot]: enabled } })}
    onReset={() => { setDraft(saved); setError(undefined); setSuccess(undefined); setLinkError(undefined); }}
    onSave={() => void save()}
  />;
}
