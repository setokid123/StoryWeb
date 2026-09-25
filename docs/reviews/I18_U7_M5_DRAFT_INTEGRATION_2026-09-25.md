# I18 — Bản ghép thử U7/M5 (2026-09-25)

## Đã ghép và kiểm tra

- Worktree `codex/i18-u7-m5-integration` ghép M5 `a688614` với view U7 đến `cd4c301`, giữ CSS sửa bởi Claude `7b5e5be`, rồi áp dụng ba thay đổi CSS của U7 `1808728`/`b9c30db`: opacity dock, padding cuối reader và nhãn một dòng trên tablet/desktop. Xung đột duy nhất ở `docs/WORKBOARD.md`; giữ bản review mới của Codex.
- `npm.cmd run build`, `npm.cmd run typecheck`, `npm.cmd run lint`, `git diff --check` đạt. `test-reader-scroll` 12/12 và `test-reader-preferences` 8/8 đạt.
- Preview tạm đã được xóa. Build đầu tiên sau dev preview hỏng do cache `.next/dev` còn route đã xóa; xóa đúng thư mục build sinh ra `.next` rồi build sạch đạt. Không có thay đổi DB/migration, quyền đọc server, unlock hay ad API.

## Còn thiếu trước khi đưa vào main

- U7 `b9c30db` ghi đã chụp ảnh Sáng/Tối bản cuối, nhưng commit không chứa ảnh hoặc walkthrough có kích thước/kết quả cụ thể. Ảnh M5 trong repo thuộc CSS cũ (trước opacity và `white-space: nowrap`). Cần ảnh hoặc walkthrough 320/360/768/1280px Sáng/Tối **trên bản ghép**. Xác nhận dock không tràn ngang, nhãn 768px một dòng, chữ phía sau không làm mờ nhãn dock, safe area và cuối chương.
- Workboard U7 ghi `Memory: đã cập nhật U7`, nhưng Memory chung tại thời điểm review không có observation mới từ Antigravity. Antigravity cần kiểm tra lại đường dẫn MCP chung và ghi kết quả thật, hoặc ghi lỗi kết nối cụ thể. `Context7: không cần` phù hợp vì thay CSS.
- Công cụ browser của phiên Codex không có tab/app khả dụng. Edge headless render trang đầu nhưng ảnh khi cuộn bị trống, nên Codex chưa xác minh trực quan bản ghép. Không dùng ảnh đó làm bằng chứng.

Chưa merge `main`, chưa push/deploy. Sau khi có chứng cứ visual và Memory đúng, chạy lại kiểm tra trên nhánh tích hợp rồi mới phát hành.

Context7: Next.js 16.3.6 local docs `01-app/01-getting-started/03-layouts-and-pages.md` và `05-server-and-client-components.md` chỉ dùng cho preview tạm; không đổi API ứng dụng. Memory: đã tra U7/M5/I17; đã cập nhật I18.
