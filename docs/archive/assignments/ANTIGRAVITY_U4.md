# U4 — Antigravity: thiết kế lại nút đọc và giao diện quảng cáo

Đọc `AGENTS.md`, `.agents/rules/project-context.md`, `docs/ADS_UNLOCK_PLAN.md`, `docs/DESIGN_SYSTEM.md`, `docs/WORKBOARD.md` và tài liệu Next.js liên quan. Mở worktree `E:\Dev\StoryWeb\.worktrees\antigravity-u4` trên nhánh `antigravity/u4-reader-ads-ui`, kiểm tra status và nhận dòng U4 trên workboard. Không dùng lại worktree U3.

Antigravity **chỉ phụ trách thiết kế và code giao diện**: JSX presentational, CSS, responsive, accessibility, ảnh kiểm tra. Claude Code phụ trách mọi logic client/server, state, API, validation, quyết định cấp quyền và provider. Component U4 nhận `props` có type và callback; không tự gọi API, đọc cookie, phát quyền hoặc kết luận đã xem quảng cáo.

## Thiết kế và component

1. **Bốn nút trong ảnh người dùng gửi:** cùng hệ màu Sáng/Tối, cùng chiều cao/icon/font; `Chương sau` là hành động chính, `Chương trước` và `Danh sách chương` là viền, `Về truyện` là phụ. Ở 360 px dùng hai hàng/lưới 2 cột, ở 768/1280 px một hàng cân đối. Nút trước/sau có disabled state thật ở đầu/cuối truyện. Mỗi target tối thiểu 44 px, focus-visible rõ.
2. **Danh sách chương** là drawer/dialog thật chứ không phải link trùng `Về truyện`: tiêu đề, trạng thái chương hiện tại/khóa, nút đóng, cuộn khi danh sách dài, Escape, Tab/Shift+Tab và trả focus về nút mở. Claude cung cấp danh sách và callback; U4 chỉ render view.
3. **Khối quảng cáo:** component view `AdSlot`/`AdSlotView` có nhãn Quảng cáo, tỉ lệ phù hợp mobile/desktop, chiều cao giữ chỗ khi đang tải, trạng thái không có quảng cáo/lỗi. Thiết kế cho `home_feed`, `story_detail`, `reader_end`, `search_results` đúng vị trí trong plan; không đặt sát nút điều hướng, không che dialog khóa hoặc đoạn truyện. Public không hiện khung mẫu khi slot tắt/no-fill; Studio preview có nhãn mẫu rõ.
4. **Dialog khóa:** trình bày một phương thức đang bật, theo view-model `off | link | rewarded`, nội dung 5 phút rõ. Link có nhãn cho biết mở liên kết; rewarded có nút xem quảng cáo, pending, unavailable và lỗi. Không viết đoạn copy khẳng định đã xem/mua hàng khi chỉ nhấp link.
5. **Studio admin:** trang/view Quảng cáo & mở khóa gồm công tắc master, đúng hai radio card phương thức, trạng thái sẵn sàng/chưa cấu hình, nút lưu, feedback, bốn slot display và preview. Với mode chưa sẵn sàng, giải thích tại chỗ; UI không tự cho phép lưu. Editor không thấy mục cài đặt này (Claude kiểm quyền và wiring).

## Ranh giới file

U4 sở hữu component presentational mới (gợi ý `src/components/reader-navigation.tsx`, `chapter-list-dialog.tsx`, `ad-slot.tsx`, `unlock-gate-view.tsx`, `unlock-settings-view.tsx`), `src/app/globals.css`, `src/app/dark-overrides.css` và `docs/DESIGN_SYSTEM.md`. Có thể thêm ảnh/ghi chú review ở `docs/reviews/`. Không sửa `src/db/**`, `drizzle/**`, `src/lib/**`, `src/app/api/**`, `src/app/doc/**`, `src/app/panel/**`, `reader-panel.tsx`, `publishing-panel.tsx` khi Claude đang làm logic. Nếu cần đổi contract, ghi props đề xuất vào workboard và trao cho Claude/Codex trước khi sửa file chung.

View cần nhận tối thiểu: mode/readyReason/expiry/action label/callback; nav href/disabled/chapter list/callback; ad slot placement/status/content; settings enabled/selected mode/readiness/slot flags/pending/error/success/onChange/onSave. Không nhúng URL affiliate thật hoặc mã quảng cáo thật vào mockup.

## Kiểm tra và bàn giao

- Ảnh/chụp màn hình hoặc walkthrough ở 360, 768, 1280 px; Sáng/Tối; trang đọc có/không khóa, drawer, Studio settings, ad loading/no-fill. Không tràn ngang hoặc xô lệch khi slot tải.
- Kiểm tra bàn phím và screen reader label cho bốn nút, drawer, switch/radio, dialog; tương phản chữ thường ít nhất 4,5:1. Không có nút quảng cáo trông như nút đọc chương.
- Chạy `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`. Commit trên nhánh U4; bàn giao mã commit, file, props contract, ảnh và lỗi còn lại. Không push `main` hoặc deploy.
