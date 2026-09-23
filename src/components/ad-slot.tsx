import { ReactNode } from "react";

export type AdPlacement = "home_feed" | "story_detail" | "reader_end" | "search_results";

export type AdSlotProps = {
  placement: AdPlacement;
  status: "idle" | "loading" | "success" | "error" | "empty";
  isPreview?: boolean; // If true, shows a placeholder when empty/idle
  children?: ReactNode; // The actual ad content
};

export function AdSlot({ placement, status, isPreview = false, children }: AdSlotProps) {
  // If not in preview mode and ad didn't load, hide completely to avoid empty gaps
  if (!isPreview && (status === "idle" || status === "empty" || status === "error")) {
    return null;
  }

  return (
    <div className={`ad-slot ad-slot--${placement} ${status === 'loading' ? 'is-loading' : ''}`}>
      <div className="ad-slot__label">Quảng cáo</div>

      <div className="ad-slot__content" aria-busy={status === "loading"}>
        {(status === "loading" || status === "success") && (
          <div className="ad-slot__mount">{children}</div>
        )}
        {status === "loading" && (
          <div className="ad-slot__placeholder" role="status">
            <span className="ad-slot__spinner" aria-hidden="true" />
            <span>Đang tải quảng cáo...</span>
          </div>
        )}

        {isPreview && (status === "idle" || status === "empty" || status === "error") && (
          <div className="ad-slot__placeholder ad-slot__placeholder--preview">
            Khung hiển thị quảng cáo ({placement})
            <br />
            <small>{status === "error" ? "Lỗi tải quảng cáo" : "Không có quảng cáo"}</small>
          </div>
        )}
      </div>
    </div>
  );
}
