import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, Link2, Loader2, RotateCcw, Save, ShieldCheck, Video } from "lucide-react";
import Link from "next/link";
import type { AdPlacement, AdSlotFlags } from "@/lib/ad-placements";
import type { AdminSettingsPayload, Readiness } from "@/lib/settings-contract";

export type UnlockMode = "link" | "rewarded";

export type UnlockSettingsProps = {
  isUnlockEnabled: boolean;
  selectedMode: UnlockMode;
  effectiveMode: AdminSettingsPayload["effectiveMode"];
  emergencyOff: boolean;
  accessMinutes: number;
  linkUrl: string;
  linkError?: string;
  linkIsEdited: boolean;
  envLinkUrlConfigured: boolean;
  slotFlags: AdSlotFlags;
  linkReadiness: Readiness;
  rewardedReadiness: Readiness;
  display: AdminSettingsPayload["display"];
  hasChanges: boolean;
  isSaving: boolean;
  successMessage?: string;
  errorMessage?: string;
  updatedAt: string | null;
  updatedBy: string | null;
  onToggleUnlock: (enabled: boolean) => void;
  onChangeMode: (mode: UnlockMode) => void;
  onChangeLinkUrl: (url: string) => void;
  onUseTestLink: () => void;
  onToggleSlot: (slot: AdPlacement, enabled: boolean) => void;
  onReset: () => void;
  onSave: () => void;
};

const slots: { id: AdPlacement; name: string; position: string }[] = [
  { id: "home_feed", name: "Trang chủ", position: "Giữa truyện nổi bật và cập nhật" },
  { id: "story_detail", name: "Chi tiết truyện", position: "Trước danh sách chương" },
  { id: "reader_end", name: "Cuối chương", position: "Sau nội dung, trước điều hướng" },
  { id: "search_results", name: "Tìm kiếm", position: "Trước kết quả tìm kiếm" },
];

function readinessLabel(readiness: Readiness, edited = false) {
  if (readiness.state === "ready") return "Sẵn sàng";
  if (readiness.state === "blocked") return "Máy chủ đang chặn";
  if (edited && readiness.state === "unconfigured") return "Chờ kiểm tra link";
  return readiness.state === "unavailable" ? "Chưa khả dụng" : "Chưa cấu hình";
}

/** View only: the container owns drafts and the server decides whether a mode can be enabled. */
export function UnlockSettingsView(props: UnlockSettingsProps) {
  const {
    isUnlockEnabled, selectedMode, effectiveMode, emergencyOff, accessMinutes,
    linkUrl, linkError, linkIsEdited, envLinkUrlConfigured, slotFlags,
    linkReadiness, rewardedReadiness, display, hasChanges, isSaving,
    successMessage, errorMessage, updatedAt, updatedBy,
    onToggleUnlock, onChangeMode, onChangeLinkUrl, onUseTestLink,
    onToggleSlot, onReset, onSave,
  } = props;
  const selectedReadiness = selectedMode === "link" ? linkReadiness : rewardedReadiness;
  const selectedBlocked = isUnlockEnabled && selectedReadiness.state !== "ready"
    && !(selectedMode === "link" && linkIsEdited && selectedReadiness.state === "unconfigured");
  const activeLabel = effectiveMode === "link" ? "Nhấp liên kết" : effectiveMode === "rewarded" ? "Quảng cáo có thưởng" : "Đang tắt";

  return (
    <main className="admin-settings">
      <header className="admin-settings__hero">
        <div>
          <Link className="admin-settings__back" href="/panel"><ArrowLeft size={16} /> Về Studio</Link>
          <p className="eyebrow">THƯ CÁC STUDIO · CÀI ĐẶT</p>
          <h1>Quảng cáo <em>&amp;</em> mở khóa</h1>
          <p>Chuẩn bị liên kết, chọn cách mở chương và bố trí quảng cáo. Chương 1 luôn miễn phí.</p>
        </div>
        <div className="admin-settings__live" aria-label="Trạng thái đang áp dụng">
          <span>ĐANG ÁP DỤNG</span>
          <strong>{activeLabel}</strong>
          <small>{effectiveMode === "off" ? "Các chương khóa chưa thể mở" : "Mỗi lượt đọc " + accessMinutes + " phút"}</small>
        </div>
      </header>

      <div className="admin-settings__layout">
        <div className="admin-settings__main">
          <section className="settings-section" aria-labelledby="unlock-heading">
            <div className="settings-section__header">
              <div className="settings-section__heading"><span className="settings-section__number">01</span><div><h2 id="unlock-heading">Bảo vệ chương khóa</h2><p>Chọn phương thức độc giả sẽ thấy ở chương khóa.</p></div></div>
              <label className="settings-master">
                <span>{isUnlockEnabled ? "Đang bật" : "Đang tắt"}</span>
                <span className="toggle-switch"><input type="checkbox" role="switch" aria-label="Bật mở khóa chương" checked={isUnlockEnabled} onChange={(event) => onToggleUnlock(event.target.checked)} disabled={isSaving} /><span className="toggle-switch__slider" /></span>
              </label>
            </div>
            <div className="settings-section__body">
              <p className="settings-hint">Bạn có thể lưu link và vị trí quảng cáo khi công tắc đang tắt. Bật mở khóa chỉ có hiệu lực khi máy chủ đã sẵn sàng.</p>
              <fieldset className="settings-modes">
                <legend>Phương thức mở khóa</legend>
                <div className="radio-cards">
                  <div className={"radio-card" + (selectedMode === "link" ? " is-selected" : "")}>
                    <label className="radio-card__choice" htmlFor="unlock-mode-link">
                      <input id="unlock-mode-link" type="radio" name="unlock-mode" value="link" checked={selectedMode === "link"} onChange={() => onChangeMode("link")} disabled={isSaving} />
                      <span className="radio-card__icon"><Link2 size={20} /></span>
                      <span className="radio-card__text"><strong>Nhấp liên kết</strong><small>Người đọc chủ động mở một liên kết để nhận quyền đọc.</small></span>
                    </label>
                    <span className={"settings-badge settings-badge--" + linkReadiness.state}>{readinessLabel(linkReadiness, linkIsEdited)}</span>
                    <div className="radio-card__details">
                      <label htmlFor="unlock-link-url">URL liên kết</label>
                      <div className="settings-link-entry">
                        <input id="unlock-link-url" className="settings-input" type="url" inputMode="url" maxLength={2048} value={linkUrl} onChange={(event) => onChangeLinkUrl(event.target.value)} disabled={isSaving} placeholder={envLinkUrlConfigured ? "Để trống để dùng URL trên máy chủ" : "https://example.com/"} aria-invalid={Boolean(linkError)} aria-describedby={linkError ? "unlock-link-help unlock-link-error" : "unlock-link-help"} />
                        <button type="button" className="settings-example" onClick={onUseTestLink} disabled={isSaving}>Điền link thử</button>
                      </div>
                      <p id="unlock-link-help" className="settings-field-help">Nhập URL HTTPS của trang công khai bất kỳ; <code>https://example.com/</code> là link mẫu. Link Shopee trực tiếp cần chấp thuận riêng. Link rút gọn có thể dẫn tới trang khác.</p>
                      {linkError && <p id="unlock-link-error" className="form-error-inline" role="alert">{linkError}</p>}
                      {linkIsEdited && linkReadiness.state === "unconfigured"
                        ? <p className="settings-readiness"><AlertCircle size={15} /> URL mới sẽ được máy chủ kiểm tra khi lưu.</p>
                        : linkReadiness.reason && <p className="settings-readiness"><AlertCircle size={15} /> {linkReadiness.reason}</p>}
                    </div>
                  </div>
                  <div className={"radio-card" + (selectedMode === "rewarded" ? " is-selected" : "")}>
                    <label className="radio-card__choice" htmlFor="unlock-mode-rewarded">
                      <input id="unlock-mode-rewarded" type="radio" name="unlock-mode" value="rewarded" checked={selectedMode === "rewarded"} onChange={() => onChangeMode("rewarded")} disabled={isSaving} />
                      <span className="radio-card__icon"><Video size={20} /></span>
                      <span className="radio-card__text"><strong>Xem quảng cáo có thưởng</strong><small>Chỉ cấp quyền khi máy chủ xác minh hoàn thành.</small></span>
                    </label>
                    <span className={"settings-badge settings-badge--" + rewardedReadiness.state}>{readinessLabel(rewardedReadiness)}</span>
                    {rewardedReadiness.reason && <p className="settings-readiness"><AlertCircle size={15} /> {rewardedReadiness.reason}</p>}
                  </div>
                </div>
              </fieldset>
              {selectedBlocked && <div className="settings-callout" role="status"><ShieldCheck size={20} /><p><strong>Chưa thể bật phương thức này.</strong> {selectedReadiness.reason} Bạn vẫn có thể tắt công tắc để lưu link và quảng cáo trước.</p></div>}
              {emergencyOff && <div className="settings-callout" role="status"><ShieldCheck size={20} /><p>Máy chủ đang tạm dừng toàn bộ mở khóa bằng <code>UNLOCK_EMERGENCY_OFF</code>.</p></div>}
            </div>
          </section>

          <section className="settings-section" aria-labelledby="ads-heading">
            <div className="settings-section__header"><div className="settings-section__heading"><span className="settings-section__number">02</span><div><h2 id="ads-heading">Vị trí quảng cáo</h2><p>Bật chỗ hiển thị độc lập với quyền mở chương.</p></div></div></div>
            <div className="settings-section__body">
              <div className={"settings-provider" + (display.state === "ready" ? " is-ready" : "")}><span className="settings-provider__dot" /><div><strong>{display.state === "ready" ? "Nhà cung cấp đã kết nối" : "Chưa có quảng cáo thực"}</strong><p>{display.reason ?? "Đang dùng " + display.provider + "; " + display.configuredSlots.length + " vị trí có mã quảng cáo."}</p></div></div>
              <ul className="settings-list">
                {slots.map((slot) => <li className="settings-list__item" key={slot.id}>
                  <div className="settings-list__info"><strong>{slot.name}</strong><span>{slot.position}</span>{slotFlags[slot.id] && !display.configuredSlots.includes(slot.id) && <small>Chưa có mã quảng cáo cho vị trí này</small>}</div>
                  <label className="toggle-switch"><input type="checkbox" role="switch" aria-label={"Hiển thị quảng cáo ở " + slot.name.toLowerCase()} checked={slotFlags[slot.id]} onChange={(event) => onToggleSlot(slot.id, event.target.checked)} disabled={isSaving} /><span className="toggle-switch__slider" /></label>
                </li>)}
              </ul>
            </div>
          </section>
        </div>

        <aside className="admin-settings__aside" aria-label="Hướng dẫn và trạng thái">
          <div className="settings-aside-card"><span className="eyebrow">KIỂM TRA NHANH</span><h2>Thử link như thế nào?</h2><ol><li>Chọn <strong>Điền link thử</strong> rồi lưu khi công tắc đang tắt.</li><li>Máy chủ cần bật <code>CLICK_UNLOCK_ENABLED</code> và có secret hợp lệ.</li><li>Quay lại bật công tắc, lưu và thử ở chương khóa.</li></ol><p>Link thử chỉ xác nhận lượt nhấp; không xác nhận người đọc đã mua hàng.</p><a href="https://example.com/" target="_blank" rel="noopener noreferrer">Mở trang link mẫu <ExternalLink size={14} /></a></div>
          <div className="settings-aside-card settings-aside-card--quiet"><span className="eyebrow">LẦN CẬP NHẬT GẦN NHẤT</span><p>{updatedAt ? new Date(updatedAt).toLocaleString("vi-VN") : "Chưa từng lưu cấu hình."}</p>{updatedAt && <small>{updatedBy ?? "Không rõ người sửa"}</small>}</div>
        </aside>
      </div>

      <div className="admin-settings__footer">
        <div className="admin-settings__feedback">
          {errorMessage && <div className="alert alert--error" role="alert"><AlertCircle size={18} /> {errorMessage}</div>}
          {successMessage && <div className="alert alert--success" role="status"><CheckCircle2 size={18} /> {successMessage}</div>}
          {!errorMessage && !successMessage && <span>{hasChanges ? "Bạn có thay đổi chưa lưu." : "Mọi thay đổi đã được lưu."}</span>}
        </div>
        <div className="admin-settings__actions">
          {hasChanges && <button type="button" className="button button--outline" onClick={onReset} disabled={isSaving}><RotateCcw size={16} /> Hoàn tác</button>}
          <button type="button" className="button button--primary" onClick={onSave} disabled={!hasChanges || isSaving}>{isSaving ? <><Loader2 size={17} className="spinner-icon" /> Đang lưu...</> : <><Save size={17} /> Lưu thay đổi</>}</button>
        </div>
      </div>
    </main>
  );
}
