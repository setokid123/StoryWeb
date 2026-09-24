# I4 — Kiểm tra trình duyệt trang đọc U5/M3

## Cách kiểm tra

- Dùng một route preview **tạm** cấp `ReaderPanel` bằng dữ liệu mẫu, không truy cập PostgreSQL. Route và script CDP được gỡ sau khi kiểm tra; không xuất hiện trong build bàn giao.
- Chrome headless/CDP tại viewport 360, 768, 901, 1101 và 1280px. Đã xem ảnh ở đầu và cuối chương, panel tùy chỉnh, nền sáng/tối; kiểm kích thước DOM và thao tác bàn phím. Đây là kiểm tra component trên app local, chưa phải smoke production hay e2e unlock trên DB.

## Lỗi phát hiện và sửa

1. Header ở 768 và 901px vẫn dùng nav desktop, khiến tên mục và nút CTA xuống dòng. CSS mới dùng menu thu gọn trong khoảng 761–1100px; 1101px các mục desktop ở một dòng. Menu 768px mở được, `aria-expanded=true` và bốn link hiển thị.
2. Bốn nút cuối chương bị canh trái trong vùng rộng vì `.reader-nav` còn `display:flex` từ U4; desktop cũng xuống dòng nhãn. Đặt nav thành block, tăng vùng nhóm nút lên 960px và chỉnh font/padding tablet. Ở 1280px bốn nút bằng nhau, căn giữa, nhãn một dòng.
3. Ở 360px CSS cũ giấu mọi nhãn nút, nên chỉ còn icon và link “Về truyện” mất tên truy cập. Hiển thị nhãn trong lưới 2×2, thêm `aria-label` cho link; mỗi nút đo được 151.5×44px, không tràn.

## Kết quả UI

- 360px: `documentElement.scrollWidth` bằng `clientWidth` (345px, sau thanh cuộn); article, tiêu đề, thân chương và panel nằm trong viewport. Chữ Việt ở sáng/tối hiển thị đúng.
- Panel tùy chỉnh: khi mở focus vào nút đóng; Shift+Tab vòng tới nút reset trong panel; Escape đóng và trả focus cho “Tùy chỉnh đọc”. Chọn Đậm tạo `data-pref-weight="bold"` với font-weight tính toán 700; A+ tăng cỡ chữ.
- 768px: bốn nút cuối chương rộng 169.75px, không có nút nào tràn; header chuyển sang menu gọn.
- Không thay đổi luồng server, body chương khóa, schema, migration hay cấu hình quảng cáo.

## Gate bàn giao

- `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run typecheck` đạt. Build cuối không còn route preview trong danh sách route.
- Sau khi xóa preview, lượt build đầu vướng `.next/dev/types/validator.ts` còn tham chiếu route tạm; I4 xóa đúng thư mục typegen dev sinh ra, chạy build rồi typecheck tuần tự và đều đạt. Không sửa cấu hình TypeScript.

## MCP và giới hạn còn lại

- `.mcp.json` của Claude Code và `~/.gemini/config/mcp_config.json` của Antigravity đều khai báo `context7`, `memory` và trỏ vào file Memory chung. Codex đã gọi Context7/Memory thực tế trong I3; I4 tra Memory theo ID. Không thể xác nhận kết nối **bên trong extension** từ phiên này: Computer Use native pipe không kết nối, browser tích hợp không có surface, `claude` CLI không có trong PATH, và VS Code CLI bị sandbox từ chối tạo thư mục user.
- Máy review không có `DATABASE_URL`, PostgreSQL service, `psql` hay Docker; I4 không chạy lại e2e mở khóa trên DB. Kết quả DB test riêng của M3 nằm trên workboard. Bản local chưa được push/deploy.
