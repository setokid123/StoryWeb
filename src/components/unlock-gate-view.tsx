import { ArrowUpRight, LockKeyhole, PlayCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

export type UnlockMode = "off" | "link" | "rewarded";
export type RewardedStatus = "idle" | "pending" | "unavailable" | "error";

export type UnlockGateViewProps = {
  chapterNumber: number;
  storySlug: string;
  mode: UnlockMode;
  rewardedStatus?: RewardedStatus; // Only used when mode === 'rewarded'
  onWatchAd?: () => void; // Callback to trigger rewarded ad
  linkHref?: string; // The URL to visit for 'link' mode
};

export function UnlockGateView({ 
  chapterNumber, 
  storySlug, 
  mode, 
  rewardedStatus = "idle", 
  onWatchAd,
  linkHref = "/unlock/visit"
}: UnlockGateViewProps) {
  return (
    <div className="unlock-backdrop">
      <div 
        className="locked-panel locked-panel--dialog" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="unlock-title"
      >
        <span className="locked-panel__icon">
          <LockKeyhole size={28} />
        </span>
        <div className="eyebrow">CHƯƠNG {chapterNumber} · NỘI DUNG KHÓA</div>
        <h2 id="unlock-title">Mở trang truyện tiếp theo</h2>

        {mode === "link" && (
          <>
            <p>Mở liên kết giới thiệu một lần để đọc các chương khóa trong 5 phút. Khi hết thời gian, bạn cần nhấp lại liên kết trước khi sang chương mới.</p>
            <a 
              className="button button--primary" 
              href={linkHref} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Mở liên kết giới thiệu <ArrowUpRight size={17} />
            </a>
            <span className="locked-panel__hint">Trang sẽ mở trong tab mới. Quay lại đây để tiếp tục đọc.</span>
          </>
        )}

        {mode === "rewarded" && (
          <>
            <p>Xem một quảng cáo ngắn để mở khóa quyền đọc tiếp trong 5 phút. Khi hết thời gian, bạn có thể xem lại quảng cáo để tiếp tục.</p>
            
            <div className="rewarded-action">
              <button 
                type="button" 
                className="button button--primary" 
                onClick={onWatchAd}
                disabled={rewardedStatus === "pending" || rewardedStatus === "unavailable"}
              >
                {rewardedStatus === "pending" ? (
                  <><Loader2 size={17} className="spinner-icon" /> Đang tải quảng cáo...</>
                ) : (
                  <><PlayCircle size={17} /> Xem quảng cáo mở khóa</>
                )}
              </button>
            </div>

            {rewardedStatus === "unavailable" && (
              <p className="form-error-inline" role="alert">Hiện tại không có quảng cáo nào khả dụng. Vui lòng thử lại sau.</p>
            )}
            
            {rewardedStatus === "error" && (
              <p className="form-error-inline" role="alert">Có lỗi xảy ra khi tải quảng cáo. Vui lòng thử lại.</p>
            )}
            
            <span className="locked-panel__hint">Bạn cần xem hết video để nhận quyền đọc.</span>
          </>
        )}

        {mode === "off" && (
          <>
            <p>Tính năng mở khóa chương hiện đang tạm tắt. Bạn có thể quay lại mục lục để chọn chương khác.</p>
            <Link href={`/truyen/${storySlug}`} className="button button--outline">
              Quay lại mục lục
            </Link>
          </>
        )}

        {mode !== "off" && (
          <div className="locked-panel__footer">
            <Link href={`/truyen/${storySlug}`} className="button button--ghost">
              Quay lại mục lục
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
