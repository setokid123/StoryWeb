# M3 — Claude Code: logic tùy chỉnh đọc và thử mở khóa

Mở `E:\Dev\StoryWeb\.worktrees\claude-m3` trên nhánh `claude/m3-reader-preferences-test-unlock`. Đọc `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKBOARD.md`, `docs/UNLOCK_API.md`, `docs/READER_U5_M3_PLAN.md`. Nhận M3 trên workboard trước khi sửa. Đọc guide Next.js liên quan trong `node_modules/next/dist/docs/` trước khi đổi code.

## Công việc

1. Sở hữu **toàn bộ logic client và server**, không chỉ backend. Tạo model preferences có type và giới hạn giá trị: font `serif/sans`, weight `normal/bold`, size 16–26, line-height, width, align, theme. Lưu localStorage theo một key có phiên bản; di chuyển `storyweb:font-size` hiện hành khi chưa có key mới; xử lý JSON lỗi/giá trị ngoài giới hạn; đồng bộ giữa tab; reset về mặc định. Tránh hydration mismatch. Tùy chỉnh chỉ tác động body chương.
2. Tích hợp `ReaderPreferencesView` do U5 bàn giao vào `reader-panel.tsx`; state panel, focus, Escape, cập nhật tức thì, theme qua provider hiện có. Phối hợp type props trước khi ghép; không sửa CSS/view U5.
3. Làm luồng **test** mở khóa link hiện có thực sự thử được với `example.com` trong môi trường tách production. Ưu tiên cấu hình đang có (`CLICK_UNLOCK_ENABLED`, secret, admin setting), không thêm bypass quyền đọc. Viết hướng dẫn rõ từng bước: DB riêng/migration, env, vào `/panel/cai-dat`, bật link, mở chương 2, trở về, kiểm tra 5 phút/chuyển chương/hết hạn. Nếu cần code bổ trợ, bảo đảm production fail-closed và không dùng provider mock để cấp quyền thật.
4. Bổ sung kiểm tra tự động cho migration preference, persistence và regression unlock: chương 1 miễn phí, chương khóa không lộ body trong HTML/RSC trước grant, grant hợp lệ/chuyển chương/hết hạn, tab quay về refresh, server chặn URL không hợp lệ và Shopee khi chưa có chấp thuận. Test phải dùng DB riêng; không chạy migration thử trên production.
5. Chỉ khi Antigravity bàn giao U5 thì ghép view; trước đó làm model, test và hướng dẫn. Báo Codex nếu hợp đồng props hoặc server contract cần đổi.

## Sở hữu file

M3 sở hữu `src/components/reader-panel.tsx`, module/hook preferences mới, test scripts và docs test, cùng logic unlock server **nếu thực sự cần**. Không sửa `reader-navigation.tsx`, view U5, `src/app/globals.css`, `src/app/dark-overrides.css` hay `docs/DESIGN_SYSTEM.md`. Nếu phải thay DB/schema/package, ghi trên workboard trước, chỉ Claude làm các file đó và bàn giao migration để Codex review.

Không bật Shopee affiliate hoặc rewarded mock trên production. `SHOPEE_GATE_APPROVED=false` cho test; liên kết test là `https://example.com/` và do người đọc chủ động bấm. Thời hạn grant vẫn 5 phút và quyền đọc vẫn được kiểm ở server. Không gửi body chương khóa trong props, HTML hoặc RSC trước grant.

## Bàn giao

Chạy `npm run typecheck`, `npm run lint`, `npm run build` và test có liên quan. Commit nhánh M3, ghi commit/file/test, hướng dẫn test và rủi ro còn lại trên workboard. Không push `main`, không deploy, không sửa worktree Antigravity.
