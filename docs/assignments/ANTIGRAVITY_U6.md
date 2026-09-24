# U6 — Antigravity: làm nổi mặt đọc và phân tầng giao diện

Mở worktree `E:\Dev\StoryWeb\.worktrees\antigravity-u6` trên nhánh `antigravity/u6-visual-hierarchy` (tạo từ `main` sau commit brief I7). Đọc `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKBOARD.md`, `docs/DESIGN_SYSTEM.md`, [kế hoạch U6](../VISUAL_HIERARCHY_U6_PLAN.md) và `docs/reviews/U5_FEEDBACK_ROUND2_2026-09-24.md`. Đổi trạng thái U6 thành `Đang làm` trên workboard trước khi sửa. Tra Memory theo `U6` và `gotcha:css-tokens`; nếu sửa API Next/React thì đọc guide đúng phiên bản trong `node_modules/next/dist/docs/` và Context7.

## Yêu cầu thiết kế và code

1. Trang đọc là ưu tiên: tạo lớp nền website và **mặt đọc riêng nổi bật** cho cả Sáng/Tối. Hiện `.reader-article` trong suốt trên `.reader-shell`; sửa nguyên nhân này và CSS trùng/đè liên quan. Tiêu đề, body, dòng kết, toolbar và 4 nút chương cần được nhìn thấy như các khu vực có thứ bậc, nhưng chữ vẫn là trọng tâm.
2. Dùng cùng hệ token bề mặt cho trang chủ, tìm kiếm, chi tiết truyện, tủ truyện và Studio để card/section nổi rõ so với nền. Giữ chất thư viện, không lạm dụng gradient hoặc shadow. Tạo hai phác thảo nhỏ về hướng màu/bề mặt, tự chọn phương án phù hợp rồi triển khai; ghi lý do lựa chọn trong design system.
3. Đảm bảo reader preferences hiện tại vẫn tác động đúng lên **body chương**: Lora/Inter, độ đậm, cỡ 16–26, độ rộng, giãn dòng, căn chữ, Sáng/Tối/Hệ thống. Kiểm mặt đọc và panel khóa ở cả hai theme. Ad slot cuối chương phải phân biệt với nội dung truyện.
4. Chỉ code lớp giao diện. Không sửa logic quyền đọc, cookie, API, DB, publisher/admin state hay tự bật Shopee/rewarded. `ReaderPanel` đang giữ state/focus/expiry; không chỉnh logic file này. Nếu CSS hiện có không đủ và cần wrapper React, tạo view thuần nhận props/children, ghi contract rồi bàn giao cho Codex để giao Claude ghép.
5. Rà CSS cascade cũ trước khi sửa. Không dùng replace màu toàn file: vòng U5 từng làm hỏng token và mã hex. Kiểm `git diff -- src/app/globals.css src/app/dark-overrides.css` để chỉ thấy selector/chủ đề U6 chủ đích; không ghi đè thay đổi chưa commit của worktree khác.

## File sở hữu

Chính: `src/app/globals.css`, `src/app/dark-overrides.css`, `docs/DESIGN_SYSTEM.md`. Có thể sửa component **trình bày**: `story-card.tsx`, `site-header.tsx`, `site-footer.tsx`, `reader-navigation.tsx`, `reader-preferences-view.tsx`, `chapter-list-dialog.tsx`, `ad-slot.tsx`, `unlock-gate-view.tsx` khi cần để đạt thiết kế/accessibility. Nếu sửa thêm file, ghi rõ trên workboard. Không sửa `src/components/reader-panel.tsx`, `src/components/use-*`, `src/lib/**`, `src/app/api/**`, `src/db/**`, `drizzle/**`, `.railway/**`, `package.json` hay `package-lock.json`.

## Bàn giao bắt buộc

- Ảnh/walkthrough **trước và sau**: reader free/locked ở 360/768/1280px, Sáng/Tối; trang chủ và chi tiết truyện. Chụp cả panel tùy chỉnh và trạng thái focus bàn phím. Ghi cách tự mở lại màn hình minh họa nếu production thiếu chương đã xuất bản.
- Bảng token nền/mặt đọc/chữ/viền/nhấn và các cặp màu đã đo. Chữ thường ≥4.5:1, dấu hiệu điều khiển quan trọng ≥3:1. Kiểm không tràn ngang, tên chương dài, font lớn, mobile 4 nút ≥44px.
- `npm run typecheck`, `npm run lint`, `npm run build` đạt; commit nhánh U6. Ghi commit, file, ảnh, CSS selectors đã hợp nhất, vấn đề còn lại, `Context7: ...` và `Memory: đã tra U6/gotcha:css-tokens; đã cập nhật U6` vào workboard. Không push `main`, không deploy; Codex review và tích hợp.

## Câu nhắc đưa vào Antigravity

> Mở `E:\Dev\StoryWeb\.worktrees\antigravity-u6`, đọc `docs/assignments/ANTIGRAVITY_U6.md` và `docs/VISUAL_HIERARCHY_U6_PLAN.md`, nhận U6 trên workboard. Thiết kế lại hệ bề mặt Sáng/Tối để vùng đọc nổi bật khỏi nền site; áp dụng nhất quán cho card/section các trang. Giữ logic và reader preferences. Bàn giao ảnh trước/sau ở 360/768/1280, đo tương phản, chạy typecheck/lint/build, commit nhánh U6.
