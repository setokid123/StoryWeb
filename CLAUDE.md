# Claude Code — Thư Các (WordPress)

Website đọc truyện trên **WordPress tự host**. Đọc `README.md`, `docs/WORDPRESS_DEPLOY.md` và `docs/reviews/WP1_THEME_PORT_2026-10-10.md` trước khi sửa.

- `wp-content/themes/thu-cac` — **giao diện** Trạm Truyện 2D (PHP template + CSS + JS thuần). Chỉ trình bày. Hệ thiết kế kính lỏng và các bẫy CSS: `docs/DESIGN_SYSTEM.md`.
- `wp-content/plugins/storyweb-core` — **logic**: truyện/chương, đường dẫn, và **khóa chương phía máy chủ**. Luật truy cập nằm ở plugin, không ở theme: đổi theme không được làm lộ chương khóa.

## Quy tắc

- **Chương khóa không bao giờ được gửi body xuống client** khi chưa có quyền — kể cả qua HTML, REST, RSS, embed, sitemap. Khi sửa, chạy lại `scripts/wp/check-content.mjs` để chắc không lộ.
- Giá trị hiển thị do admin nhập phải được `esc_*` khi in ra; dữ liệu vào phải `sanitize_*`. Truy vấn DB dùng `$wpdb->prepare`.
- Logic trang đọc (tùy chỉnh đọc, ẩn/hiện toolbar) là JS thuần trong `assets/js/reader-core.js`, có unit test (`npm test`). Sửa logic thì cập nhật test.
- Mở khóa bằng link nằm ở plugin: `inc/unlock.php` (cookie ký HMAC, `/mo-khoa/`, **giới hạn tần suất** theo `docs/reviews/SEC1_OWASP_REVIEW_2026-10-09.md`) và trang cài đặt `inc/unlock-admin.php` (Truyện → Mở khóa chương). Quyền đọc luôn kiểm phía server; sửa thì chạy `scripts/wp/check-unlock.mjs` trên site Playground mới.
- Thống kê (Truyện → Thống kê, `inc/stats.php` + `inc/stats-admin.php`): lượt đọc lấy từ Post Views Counter; lượt gặp chương khóa, lượt bấm, link được mở và lượt bị chặn do plugin tự đếm theo ngày (bảng `{prefix}storyweb_stats`, không lưu IP).

## Kiểm tra

- Sổ tay vận hành (máy mới, site thử, deploy, SSH vào Railway, sửa dữ liệu thật bằng script có chạy thử và sao lưu): `docs/VAN_HANH_RAILWAY.md`.
- `npm test` — logic trang đọc.
- WordPress Playground + 5 script trong `scripts/wp/` (nội dung/chống lộ, trình duyệt, wp-admin, mở khóa bằng link, đăng Facebook với `mock-facebook.php` thay Facebook): xem `scripts/wp/README.md`.
- Đăng Facebook (`storyweb-core/inc/facebook*.php`, cả tự động theo mã) chỉ lấy giới thiệu truyện hoặc chương **miễn phí**; mã Page không bao giờ in ra trang.
- Mã truyện `TT2D1, TT2D2…` (`storyweb-core/inc/story-code.php`): tên truyện bắt đầu bằng mã, link là mã (`/truyen/tt2d1/`, `/doc/tt2d1/3/`), link cũ chuyển 301. Truyện cũ đánh mã bằng `scripts/wp/assign-story-codes.php`.
- Đóng gói tải lên wp-admin: `node scripts/wp/package.mjs`.

## MCP Context7 và Memory

Theo `docs/MCP_TOOLS.md` (khai báo trong `.mcp.json`): tra Memory khi nhận việc, tra Context7 trước khi dùng API thư viện, ghi Memory khi bàn giao.
