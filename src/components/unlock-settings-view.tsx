import { Loader2, Save, Link as LinkIcon, PlaySquare, AlertCircle, CheckCircle2 } from "lucide-react";

export type UnlockMode = "link" | "rewarded";

export type ModeReadiness = {
  isReady: boolean;
  reason?: string;
};

export type AdSlotFlags = {
  home_feed: boolean;
  story_detail: boolean;
  reader_end: boolean;
  search_results: boolean;
};

export type UnlockSettingsProps = {
  isUnlockEnabled: boolean;
  selectedMode: UnlockMode;
  slotFlags: AdSlotFlags;
  
  // Readiness from server/Claude logic
  linkReadiness: ModeReadiness;
  rewardedReadiness: ModeReadiness;
  
  // States
  isSaving: boolean;
  successMessage?: string;
  errorMessage?: string;
  
  // Callbacks
  onToggleUnlock: (enabled: boolean) => void;
  onChangeMode: (mode: UnlockMode) => void;
  onToggleSlot: (slot: keyof AdSlotFlags, enabled: boolean) => void;
  onSave: () => void;
};

export function UnlockSettingsView({
  isUnlockEnabled,
  selectedMode,
  slotFlags,
  linkReadiness,
  rewardedReadiness,
  isSaving,
  successMessage,
  errorMessage,
  onToggleUnlock,
  onChangeMode,
  onToggleSlot,
  onSave
}: UnlockSettingsProps) {
  
  // Cannot save if selected mode is not ready
  const isSelectedModeReady = selectedMode === "link" ? linkReadiness.isReady : rewardedReadiness.isReady;
  const canSave = isSelectedModeReady && !isSaving;

  return (
    <div className="admin-settings">
      <header className="admin-settings__header">
        <h1>Quảng cáo & Mở khóa</h1>
        <p>Quản lý quyền đọc chương khóa và các vị trí quảng cáo trên hệ thống.</p>
      </header>

      <section className="settings-section">
        <div className="settings-section__header">
          <h2>Bảo vệ chương khóa</h2>
          <div className="toggle-switch-wrapper">
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isUnlockEnabled} 
                onChange={(e) => onToggleUnlock(e.target.checked)}
                disabled={isSaving}
              />
              <span className="toggle-switch__slider"></span>
            </label>
            <span className="toggle-switch__label">
              {isUnlockEnabled ? "Đang bật" : "Đang tắt"}
            </span>
          </div>
        </div>

        <div className={`settings-section__body ${!isUnlockEnabled ? 'is-disabled' : ''}`}>
          <p className="settings-hint">
            Chương 1 luôn miễn phí. Các chương sau sẽ yêu cầu độc giả thực hiện một trong hai hành động dưới đây để nhận 5 phút đọc.
          </p>

          <div className="radio-cards">
            {/* Link Mode */}
            <label className={`radio-card ${selectedMode === 'link' ? 'is-selected' : ''} ${!linkReadiness.isReady ? 'is-unavailable' : ''}`}>
              <div className="radio-card__input">
                <input 
                  type="radio" 
                  name="unlock-mode" 
                  value="link" 
                  checked={selectedMode === 'link'} 
                  onChange={() => onChangeMode('link')}
                  disabled={isSaving || !isUnlockEnabled}
                />
              </div>
              <div className="radio-card__content">
                <div className="radio-card__header">
                  <LinkIcon size={20} />
                  <h3>Nhấp liên kết</h3>
                  {linkReadiness.isReady ? (
                    <span className="badge badge--success">Sẵn sàng</span>
                  ) : (
                    <span className="badge badge--warning">Chưa cấu hình</span>
                  )}
                </div>
                <p>Độc giả nhấp vào một liên kết tiếp thị (ví dụ: Shopee) để nhận quyền đọc.</p>
                {!linkReadiness.isReady && linkReadiness.reason && (
                  <p className="radio-card__error"><AlertCircle size={14}/> {linkReadiness.reason}</p>
                )}
              </div>
            </label>

            {/* Rewarded Mode */}
            <label className={`radio-card ${selectedMode === 'rewarded' ? 'is-selected' : ''} ${!rewardedReadiness.isReady ? 'is-unavailable' : ''}`}>
              <div className="radio-card__input">
                <input 
                  type="radio" 
                  name="unlock-mode" 
                  value="rewarded" 
                  checked={selectedMode === 'rewarded'} 
                  onChange={() => onChangeMode('rewarded')}
                  disabled={isSaving || !isUnlockEnabled}
                />
              </div>
              <div className="radio-card__content">
                <div className="radio-card__header">
                  <PlaySquare size={20} />
                  <h3>Xem quảng cáo (Rewarded)</h3>
                  {rewardedReadiness.isReady ? (
                    <span className="badge badge--success">Sẵn sàng</span>
                  ) : (
                    <span className="badge badge--warning">Chưa cấu hình</span>
                  )}
                </div>
                <p>Độc giả xem một đoạn video quảng cáo ngắn để nhận quyền đọc.</p>
                {!rewardedReadiness.isReady && rewardedReadiness.reason && (
                  <p className="radio-card__error"><AlertCircle size={14}/> {rewardedReadiness.reason}</p>
                )}
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <h2>Quảng cáo hiển thị (Display Ads)</h2>
        </div>
        <div className="settings-section__body">
          <p className="settings-hint">Các khối quảng cáo hiển thị thông thường, không liên quan đến việc mở khóa chương.</p>
          
          <ul className="settings-list">
            <li className="settings-list__item">
              <div className="settings-list__info">
                <strong>Trang chủ</strong>
                <span>Sau cụm truyện nổi bật, trước cập nhật</span>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={slotFlags.home_feed} 
                  onChange={(e) => onToggleSlot('home_feed', e.target.checked)}
                  disabled={isSaving}
                />
                <span className="toggle-switch__slider"></span>
              </label>
            </li>
            <li className="settings-list__item">
              <div className="settings-list__info">
                <strong>Chi tiết truyện</strong>
                <span>Trước danh sách chương</span>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={slotFlags.story_detail} 
                  onChange={(e) => onToggleSlot('story_detail', e.target.checked)}
                  disabled={isSaving}
                />
                <span className="toggle-switch__slider"></span>
              </label>
            </li>
            <li className="settings-list__item">
              <div className="settings-list__info">
                <strong>Cuối chương truyện</strong>
                <span>Sau nội dung chương, trước thanh điều hướng</span>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={slotFlags.reader_end} 
                  onChange={(e) => onToggleSlot('reader_end', e.target.checked)}
                  disabled={isSaving}
                />
                <span className="toggle-switch__slider"></span>
              </label>
            </li>
            <li className="settings-list__item">
              <div className="settings-list__info">
                <strong>Kết quả tìm kiếm</strong>
                <span>Sau bộ lọc, trước kết quả</span>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={slotFlags.search_results} 
                  onChange={(e) => onToggleSlot('search_results', e.target.checked)}
                  disabled={isSaving}
                />
                <span className="toggle-switch__slider"></span>
              </label>
            </li>
          </ul>
        </div>
      </section>

      <div className="admin-settings__footer">
        {errorMessage && (
          <div className="alert alert--error" role="alert">
            <AlertCircle size={18} /> {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="alert alert--success" role="status">
            <CheckCircle2 size={18} /> {successMessage}
          </div>
        )}
        <button 
          type="button" 
          className="button button--primary" 
          onClick={onSave}
          disabled={!canSave}
        >
          {isSaving ? (
            <><Loader2 size={18} className="spinner-icon" /> Đang lưu...</>
          ) : (
            <><Save size={18} /> Lưu thay đổi</>
          )}
        </button>
      </div>
    </div>
  );
}
