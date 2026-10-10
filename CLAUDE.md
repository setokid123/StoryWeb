# Claude Code — Thư Các (WordPress)

Website đọc truyện trên **WordPress tự host**. Đọc `README.md`, `docs/WORDPRESS_DEPLOY.md` và `docs/reviews/WP1_THEME_PORT_2026-10-10.md` trước khi sửa.

- `wp-content/themes/thu-cac` — **giao diện** Trạm Truyện 2D (PHP template + CSS + JS thuần). Chỉ trình bày. Hệ thiết kế kính lỏng và các bẫy CSS: `docs/DESIGN_SYSTEM.md`.
- `wp-content/plugins/storyweb-core` — **logic**: truyện/chương, đường dẫn, và **khóa chương phía máy chủ**. Luật truy cập nằm ở plugin, không ở theme: đổi theme không được làm lộ chương khóa.

## Quy tắc

- **Chương khóa không bao giờ được gửi body xuống client** khi chưa có quyền — kể cả qua HTML, REST, RSS, embed, sitemap. Khi sửa, chạy lại `scripts/wp/check-content.mjs` để chắc không lộ.
- Giá trị hiển thị do admin nhập phải được `esc_*` khi in ra; dữ liệu vào phải `sanitize_*`. Truy vấn DB dùng `$wpdb->prepare`.
- Logic trang đọc (tùy chỉnh đọc, ẩn/hiện toolbar) là JS thuần trong `assets/js/reader-core.js`, có unit test (`npm test`). Sửa logic thì cập nhật test.
- Mở khóa bằng link nằm ở plugin: `inc/unlock.php` (cookie ký HMAC, `/mo-khoa/`, **giới hạn tần suất** theo `docs/reviews/SEC1_OWASP_REVIEW_2026-10-09.md`) và trang cài đặt `inc/unlock-admin.php` (Truyện → Mở khóa chương). Quyền đọc luôn kiểm phía server; sửa thì chạy `scripts/wp/check-unlock.mjs` trên site Playground mới.

## Kiểm tra

- `npm test` — logic trang đọc.
- WordPress Playground + 4 script trong `scripts/wp/` (nội dung/chống lộ, trình duyệt, wp-admin, mở khóa bằng link): xem `scripts/wp/README.md`.
- Đóng gói tải lên wp-admin: `node scripts/wp/package.mjs`.

## MCP Context7 và Memory

Theo `docs/MCP_TOOLS.md` (khai báo trong `.mcp.json`): tra Memory khi nhận việc, tra Context7 trước khi dùng API thư viện, ghi Memory khi bàn giao.
