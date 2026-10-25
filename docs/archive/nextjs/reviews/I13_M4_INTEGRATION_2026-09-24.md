# I13 — Review và tích hợp M4 (2026-09-24)

## Kết luận

Đã review Claude Code M4 tại `6a5748d` và ghép vào nhánh `codex/i13-m4-review`. API admin, readiness và `/unlock/visit` dùng chung `normalizeUnlockLinkUrl`: URL HTTPS trên tên miền công khai không còn bị giới hạn ở Shopee/`example.com`. URL Shopee trực tiếp vẫn cần `SHOPEE_GATE_APPROVED=true`; client không quyết định điều kiện này. Không có schema/migration/package thay đổi.

## Bảo mật và quyền đọc

- Server từ chối scheme khác HTTPS, credentials, IP literal (kể cả IPv4 dạng rút gọn/mã hóa và IPv6), localhost, tên miền một nhãn/nội bộ, URL quá dài hoặc sai cú pháp. URL được chuẩn hóa trước khi lưu; `/unlock/visit` chỉ dùng URL được server xác nhận trong `resolveUnlock`. Server không fetch đích nên không có SSRF qua kiểm tra URL. Redirect/link rút gọn có thể tới đích khác; hệ thống chỉ xác nhận lượt nhấp trên StoryWeb.
- `CLICK_UNLOCK_ENABLED`, secret ≥32 ký tự, công tắc admin và `UNLOCK_EMERGENCY_OFF` vẫn chặn mode. Cookie HMAC hạn 300 giây gắn mode/revision; đổi URL làm tăng revision và thu hồi grant cũ. Không đổi route cấp grant, Fetch Metadata, route đọc chương hoặc cơ chế lọc body khỏi HTML/RSC. Rewarded vẫn fail-closed khi thiếu provider xác minh phía server.
- M4 test trên PostgreSQL Railway bằng DB riêng và đã xóa: migration 0000–0003 giữ dữ liệu, link E2E 11/11 (lưu/reload/bật URL Wikipedia; 303 + cookie; chương 2/3 chỉ có body sau grant; đổi URL thu hồi grant; cờ server tắt trả 409), M2 14/14, B1 15/15, smoke đạt. Đây là kết quả bàn giao của Claude; Codex đã kiểm diff/test và chạy lại unit URL 7/7 cùng rewarded flow 9/9. Không chạy lại DB E2E lần hai vì không còn DB test và thay đổi reviewer chỉ ở giao diện/copy.

## Sửa khi tích hợp

- Lỗi `409 conflict` trước đây tải lại settings và ghi đè toàn bộ bản nháp. Container nay lấy version mới rồi chỉ áp lại các trường người dùng đã sửa, gồm từng vị trí quảng cáo; thông báo yêu cầu kiểm tra và lưu lại. Lỗi `409 mode_not_ready` của M4 tiếp tục giữ bản nháp, phân biệt URL và cấu hình server.
- Hướng dẫn trong admin nói rõ URL HTTPS công khai bất kỳ, Shopee trực tiếp cần chấp thuận, link rút gọn có thể chuyển đích. README cập nhật cờ server và quy trình thử, tránh mô tả cũ chỉ nhắc `example.com`.

## Kiểm tra và giới hạn

Trên nhánh review: `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, unit URL 7/7 và rewarded flow 9/9 đều đạt. Chưa có kiểm thử thao tác form M4 trên trình duyệt thật; E2E API và QA trình duyệt I12 bao phủ phần lưu settings trước M4. Cần smoke UI admin sau khi deploy. Production vẫn giữ `CLICK_UNLOCK_ENABLED=false` cho tới bước cấu hình phát hành; công tắc admin đang tắt. Không bật `SHOPEE_GATE_APPROVED` hoặc rewarded.

Context7: không cần (M4 và sửa tích hợp chỉ dùng API sẵn có, không đổi API thư viện; tài liệu Next.js 16 trong repo giữ nguyên). Memory: đã tra M4/unlock-grant; cập nhật I13 sau tích hợp.
