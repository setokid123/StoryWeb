# I18 — Tích hợp U7/M5 (2026-09-25)

## Đã ghép và kiểm tra

- Worktree `codex/i18-u7-m5-integration` ghép M5 `a688614` với view U7 đến `cd4c301`, giữ CSS sửa bởi Claude `7b5e5be`, rồi áp dụng ba thay đổi CSS của U7 `1808728`/`b9c30db`: opacity dock, padding cuối reader và nhãn một dòng trên tablet/desktop. Xung đột duy nhất ở `docs/WORKBOARD.md`; giữ bản review mới của Codex.
- Sau khi nhận U7 `2c2f8e5`, đã đối chiếu các file UI với nhánh ghép: chỉ khác hai sửa CSS có chủ đích của M5 (`visibility:hidden` cho toolbar và điều kiện fallback blur gộp). Ảnh U7 và walkthrough được đưa vào nhánh tích hợp.
- `npm.cmd run build`, `npm.cmd run typecheck`, `npm.cmd run lint`, `git diff --check` đạt trên bản ghép cuối. `test-reader-scroll` 12/12 và `test-reader-preferences` 8/8 đạt. Build sau khi xóa route QA tạm sạch, không chứa `/qa-i18`.
- Preview tạm đã được xóa. Build đầu tiên sau dev preview hỏng do cache `.next/dev` còn route đã xóa; xóa đúng thư mục build sinh ra `.next` rồi build sạch đạt. Không có thay đổi DB/migration, quyền đọc server, unlock hay ad API.

## Bằng chứng visual và giới hạn

- Đã xem tám [ảnh U7](screenshots/u7-light-320px.png) và [walkthrough](U7_VISUAL_WALKTHROUGH.md): 320/360px là lưới 2×2, 768/1280px một hàng, nhãn 768px không xuống dòng; nền Sáng/Tối và kích thước nút 44px hợp lý. Ảnh được chụp trên route thử `Test Page for U7 Floating Navigation`, **không phải ReaderPanel đã ghép M5**. Ở ảnh 768px, dòng chữ cuối trang thử vẫn nằm phía sau dock; vì vậy ảnh không chứng minh tuyên bố “không che chắn chữ”. ReaderPanel thật có `padding-bottom: calc(90px + env(safe-area-inset-bottom))` và M5 ẩn dock khi nav cuối vào viewport, nhưng chưa có ảnh bản ghép cuối xác minh trên thiết bị thật.
- [Ảnh M5 trên ReaderPanel](screenshots/m5-w768-dock.png) và walkthrough Chrome 19/19 chứng minh logic tương tác trước ba thay đổi CSS cuối của U7. Chúng không được gọi là ảnh của CSS cuối.
- Memory chung đã có observation U7 của Antigravity về `white-space`, opacity và padding. `Context7: không cần` phù hợp vì U7 chỉ thay CSS.
- Codex thử route preview cục bộ, nhưng Chrome headless không khởi tạo được GPU/CDP trong phiên này. Route, script, profile trình duyệt và log thử đã gỡ; không tính đây là QA visual đạt.

Mã đã đủ điều kiện tích hợp local vào `main` theo kiểm tra tĩnh, unit và bằng chứng visual ở mức component. Trước khi push/deploy production, cần walkthrough/ảnh ReaderPanel đã ghép ở 320/360/768/1280px Sáng/Tối, kiểm cuối chương và safe area thực tế. Không có thay đổi DB/migration hoặc quyền đọc server trong I18.

Context7: Next.js 16.3.6 local docs `01-app/01-getting-started/03-layouts-and-pages.md` và `05-server-and-client-components.md` chỉ dùng cho preview tạm; không đổi API ứng dụng. Memory: đã tra U7/M5/I18; đã cập nhật I18.
