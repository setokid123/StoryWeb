"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { AD_PLACEMENT_INFO, AD_PLACEMENTS, type AdPlacement, type AdSlotFlags } from "@/lib/ad-placements";
import type { AdminSettingsPayload, AdminSettingsUpdate } from "@/lib/settings-contract";
import type { UnlockSettingsViewProps } from "@/components/view-contracts";

type Draft = { enabled: boolean; mode: "link" | "rewarded"; linkUrl: string; slots: AdSlotFlags };

function draftFrom(payload: AdminSettingsPayload): Draft {
  return { enabled: payload.settings.unlockEnabled, mode: payload.settings.unlockMode, linkUrl: payload.settings.unlockLinkUrl ?? "", slots: payload.settings.adSlots };
}

const MODE_LABEL = { link: "Nhấp liên kết", rewarded: "Xem quảng cáo có thưởng" } as const;
const STATE_LABEL = { ready: "Sẵn sàng", unconfigured: "Chưa cấu hình", unavailable: "Không khả dụng", blocked: "Bị chặn" } as const;

/** Default view until U4's UnlockSettingsView is merged; unstyled native controls, same props contract. */
function DefaultUnlockSettingsView(props: UnlockSettingsViewProps) {
  const { enabled, selectedMode, linkUrl, readiness, effectiveMode, slots, slotInfo, display, revision, updatedAt, updatedBy, dirty, canSave, saveBlockedReason, pending, error, success, fieldErrors } = props;
  return <section className="panel-access"><div className="panel-access__card">
    <div className="eyebrow">THƯ CÁC STUDIO · CHỈ ADMIN</div>
    <h1>Quảng cáo &amp; <em>mở khóa</em></h1>
    <p><Link href="/panel">← Về Studio</Link></p>
    <p>Chương 1 luôn miễn phí. Mỗi lượt mở khóa cho đọc 5 phút. Đang áp dụng cho người đọc: <strong>{effectiveMode === "off" ? "Tắt" : MODE_LABEL[effectiveMode]}</strong> (revision {revision}).</p>
    <label><input type="checkbox" checked={enabled} onChange={(event) => props.onToggleEnabled(event.target.checked)} disabled={pending} /> Bật mở khóa chương</label>
    <fieldset disabled={pending}>
      <legend>Phương thức (chỉ một)</legend>
      {(["link", "rewarded"] as const).map((mode) => <label key={mode} style={{ display: "block" }}>
        <input type="radio" name="unlock-mode" value={mode} checked={selectedMode === mode} onChange={() => props.onSelectMode(mode)} /> {MODE_LABEL[mode]} — {STATE_LABEL[readiness[mode].state]}
        {readiness[mode].reason && <small style={{ display: "block" }}>{readiness[mode].reason}</small>}
      </label>)}
      {fieldErrors.unlockMode && <p role="alert">{fieldErrors.unlockMode}</p>}
    </fieldset>
    <label style={{ display: "block" }}>URL liên kết (để trống để dùng CLICK_UNLOCK_URL trên máy chủ)
      <input type="url" value={linkUrl} onChange={(event) => props.onLinkUrlChange(event.target.value)} disabled={pending} placeholder="https://" style={{ display: "block", width: "100%" }} />
    </label>
    {fieldErrors.linkUrl && <p role="alert">{fieldErrors.linkUrl}</p>}
    <p><small>Nhấp liên kết chỉ xác nhận người đọc đã bấm nút trên StoryWeb, không xác nhận đã xem trang đích hay mua hàng.</small></p>
    <fieldset disabled={pending}>
      <legend>Khối quảng cáo hiển thị (không cấp quyền đọc) — {STATE_LABEL[display.state]}{display.reason ? `: ${display.reason}` : ""}</legend>
      {AD_PLACEMENTS.map((placement) => <label key={placement} style={{ display: "block" }}>
        <input type="checkbox" checked={slots[placement]} onChange={(event) => props.onToggleSlot(placement, event.target.checked)} /> {slotInfo[placement].label} — {slotInfo[placement].position}{slotInfo[placement].configured ? "" : " (chưa có mã đơn vị)"}
      </label>)}
    </fieldset>
    {saveBlockedReason && <p role="alert">{saveBlockedReason}</p>}
    {error && <p role="alert">{error}</p>}
    {success && <p role="status">{success}</p>}
    <button type="button" className="button button--primary" onClick={props.onSave} disabled={!dirty || !canSave || pending} aria-busy={pending}>{pending ? "Đang lưu…" : "Lưu cài đặt"}</button>{" "}
    <button type="button" className="button button--outline" onClick={props.onReset} disabled={!dirty || pending}>Hoàn tác</button>
    <p><small>{updatedAt ? `Cập nhật ${new Date(updatedAt).toLocaleString("vi-VN")} bởi ${updatedBy ?? "không rõ"}` : "Chưa từng lưu."}</small></p>
  </div></section>;
}

export function UnlockSettingsContainer({ initial, View = DefaultUnlockSettingsView }: { initial: AdminSettingsPayload; View?: ComponentType<UnlockSettingsViewProps> }) {
  const [payload, setPayload] = useState(initial);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<UnlockSettingsViewProps["fieldErrors"]>({});

  const saved = draftFrom(payload);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  // Client-side mirror of the server rule (the server re-checks): enabling needs a ready mode. The link check here
  // uses the saved readiness; a changed URL is validated by the server on save.
  const selectedReadiness = payload.readiness[draft.mode];
  const linkChanged = draft.mode === "link" && draft.linkUrl !== saved.linkUrl;
  const saveBlockedReason = draft.enabled && selectedReadiness.state !== "ready" && !(linkChanged && selectedReadiness.state === "unconfigured")
    ? selectedReadiness.reason ?? "Phương thức này chưa sẵn sàng."
    : null;

  const slotInfo = useMemo(() => Object.fromEntries(AD_PLACEMENTS.map((placement) => [placement, { ...AD_PLACEMENT_INFO[placement], configured: payload.display.configuredSlots.includes(placement) }])) as UnlockSettingsViewProps["slotInfo"], [payload.display.configuredSlots]);

  function change(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
    setError(null);
    setSuccess(null);
    setFieldErrors({});
  }

  async function save() {
    if (!dirty || pending || saveBlockedReason) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    const body: AdminSettingsUpdate = { version: payload.settings.version, unlockEnabled: draft.enabled, unlockMode: draft.mode, unlockLinkUrl: draft.linkUrl.trim() || null, adSlots: draft.slots };
    try {
      const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json().catch(() => ({}));
      if (response.ok) {
        setPayload(json as AdminSettingsPayload);
        setDraft(draftFrom(json as AdminSettingsPayload));
        setSuccess("Đã lưu. Quyền đọc cấp theo cấu hình cũ đã hết hiệu lực nếu bạn đổi phương thức mở khóa.");
        return;
      }
      if (response.status === 401) { setError("Phiên đăng nhập đã hết. Hãy đăng nhập lại."); return; }
      if (response.status === 409 && json.code === "conflict") {
        setError(json.error ?? "Cấu hình đã thay đổi ở nơi khác.");
        const latest = await fetch("/api/admin/settings", { cache: "no-store" });
        if (latest.ok) setPayload(await latest.json());
        return;
      }
      setError(typeof json.error === "string" ? json.error : "Không lưu được cài đặt. Vui lòng thử lại.");
      if (json.fields) setFieldErrors({ linkUrl: json.fields.linkUrl, unlockMode: json.fields.unlockMode, adSlots: json.fields.adSlots });
    } catch {
      setError("Mất kết nối. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  return <View
    enabled={draft.enabled}
    selectedMode={draft.mode}
    linkUrl={draft.linkUrl}
    readiness={{ link: payload.readiness.link, rewarded: { ...payload.readiness.rewarded } }}
    effectiveMode={payload.effectiveMode}
    slots={draft.slots}
    slotInfo={slotInfo}
    display={{ state: payload.display.state, reason: payload.display.reason, provider: payload.display.provider }}
    revision={payload.settings.unlockRevision}
    updatedAt={payload.settings.updatedAt}
    updatedBy={payload.settings.updatedBy}
    dirty={dirty}
    canSave={!saveBlockedReason}
    saveBlockedReason={saveBlockedReason}
    pending={pending}
    error={error}
    success={success}
    fieldErrors={fieldErrors}
    onToggleEnabled={(enabled) => change({ enabled })}
    onSelectMode={(mode) => change({ mode })}
    onLinkUrlChange={(linkUrl) => change({ linkUrl })}
    onToggleSlot={(placement: AdPlacement, enabled: boolean) => change({ slots: { ...draft.slots, [placement]: enabled } })}
    onSave={() => void save()}
    onReset={() => { setDraft(saved); setError(null); setSuccess(null); setFieldErrors({}); }}
  />;
}
