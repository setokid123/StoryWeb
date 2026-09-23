# Review tích hợp U3 — 23/09/2026

Nguồn: nhánh `antigravity/u3-studio-reader`, commit `9660905`; tích hợp trên `main` sau B1 (`86e5dd1`).

## Kết quả

- Font Inter/Lora có subset tiếng Việt, giao diện Sáng/Tối, Studio và trang đọc đã được ghép với backend B1 mà không có conflict.
- Antigravity đã sửa các lỗi lint và đồng bộ thay đổi `prefers-color-scheme` qua `useSyncExternalStore`. Màu đoạn mô tả trong dialog khóa khi đọc tối là `#9fb3ab` trên `#263635`, tương phản 5,72:1.
- Codex chuyển thay đổi `html[data-theme]` sang `useLayoutEffect` để React render không tạo tác dụng phụ DOM; đồng bộ logic đọc preference cũ giữa script khởi tạo và external store; bỏ CSS `.locked-panel` lặp, khoảng trắng dư và dòng U3 trùng trong workboard.
- Trên mã đã tích hợp: `npm run typecheck`, `npm run lint`, `npm run build` đều đạt. Bản build gồm đủ API tài khoản của B1 và các trang Studio/Reader của U3.
- Merge commit `7e391e0` đã push lên `main`; Railway deployment `02114504-a7e6-4119-8fa1-54fd836614da` báo `SUCCESS`. Smoke production: `/api/health`, `/`, `/panel`, `/tim-kiem` đều trả HTTP 200; HTML các trang có script khởi tạo theme.

## Giới hạn kiểm tra

Ảnh responsive 360/768/1280 px, font tiếng Việt và thao tác bàn phím trong `docs/reviews/screenshots/` là bằng chứng của lần review trước. Chrome headless trong phiên tích hợp này thoát khi khởi động, nên chưa kiểm thử lại trên trình duyệt tình huống hệ điều hành đổi theme khi trang đang mở. Kết luận đồng bộ theme mới dựa trên luồng `matchMedia`/external store và typecheck, lint, build; cần smoke trực tiếp sau deploy.

UI đăng nhập tài khoản reader/editor của B1 chưa nằm trong phạm vi U3. Luồng mở khóa bằng link vẫn mặc định tắt theo cấu hình hiện tại.
