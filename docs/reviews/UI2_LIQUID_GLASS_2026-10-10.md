# UI2 — Thiết kế lại giao diện: Trạm Truyện 2D, kính lỏng — 2026-10-10

Nhánh `claude/liquid-glass-redesign`. Người dùng yêu cầu thiết kế lại theme vì giao diện cũ "xấu": phong cách kính lỏng (liquid glass) như iPhone, chủ đề **Trạm Truyện 2D**, tự làm logo, icon, ảnh minh họa.

## Thay đổi

- **Nhận diện**: "2D" là hai chữ D (tên hai vợ chồng chủ trang), không phải hoạt hình 2D. Logo tự vẽ: bong bóng thoại hình trạm dừng với hai chữ D lồng nhau + tia sáng, chữ "Trạm Truyện" + nhãn kính "2D", favicon SVG, `screenshot.png` cho wp-admin, tên theme "Trạm Truyện 2D". Header trước đây ghi cứng "THƯ CÁC" dù tên site là `tramtruyen2d`; nay tên lấy từ Tùy biến (mặc định "Trạm Truyện 2D").
- **Ảnh minh họa**: `template-parts/scene.php` — sân ga trên mây (mặt trời/trăng, dây điện, trang giấy bay, tàu điện "TRẠM TRUYỆN 2D"), SVG đổi màu theo Sáng/Tối. Không dùng ảnh AI trả phí.
- **CSS mới** `assets/css/tram.css` thay `globals.css` + `dark-overrides.css` + `wp.css` (bỏ luôn CSS chết của Studio/Next.js). Phông Unbounded + Be Vietnam Pro; Lora chỉ tải ở trang đọc.
- **Kính lỏng**: `.lg` (blur + saturate + viền phản quang), `assets/js/glass.js` (ánh sáng theo chuột, nghiêng vé, khúc xạ SVG thật trên Chromium). Chi tiết và bẫy: [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md).
- **Trang chủ**: vé nổi bật, tuyến thể loại có số, kệ đề cử theo ngày, bảng giờ tàu (chương mới nhất của 6 truyện vừa cập nhật), khoang đọc.
- **Trang truyện**: ánh bìa mờ phía sau, bảng kính, lộ trình chương kiểu tuyến metro, nút "Đọc tiếp chương N".
- **Trang đọc**: toolbar/dock kính, giấy kính, thanh tiến độ cuộn. Logic đọc (`reader-core.js`, `reader.js`) không đổi.
- **Điện thoại**: menu hamburger thay bằng tab bar kính ở đáy (ẩn ở trang đọc).

Luật khóa chương không đổi: theme vẫn chỉ gọi `storyweb_chapter_body()`; bảng giờ tàu chỉ đọc tiêu đề và số chương (như danh sách chương).

## Kiểm tra (WordPress Playground, PHP 8.3, `WP_DEBUG`)

- `check-content.mjs` **51/51**: không lộ chương khóa qua 21 đường + `<head>`; cập nhật các kiểm tra cấu trúc cho markup mới (vé, kệ, bảng giờ tàu, lộ trình).
- `check-browser.mjs` **46/46**: không tràn ngang ở 1280/360 × Sáng/Tối, phông, tùy chỉnh đọc, toolbar/dock, danh sách chương, cổng khóa, tủ truyện; kiểm tra menu điện thoại đổi thành tab bar (cố định ở đáy, 4 mục, đánh dấu trang hiện tại, không che chân trang; ẩn ở trang đọc). Trang chương khóa không còn tải Lora.
- `check-admin.mjs` **11/11**, `npm test` **20/20**, không có cảnh báo PHP.
- Xem bằng mắt ở 1440, 1200, 390px, Sáng/Tối: trang chủ, khám phá, truyện, đọc, chương khóa, 404, tủ truyện, bảng tùy chỉnh, danh sách chương.

## Còn lại

- Chưa đổi tên site (Cài đặt → Tổng quan) trên site thật: thẻ `<title>` vẫn là `tramtruyen2d`.
- Chưa deploy: deploy = merge vào `main` rồi push (Railway dựng lại, ~1 phút gián đoạn).
- Context7: đã tra WordPress `wp_get_attachment_image_url`. Memory: đã cập nhật `UI2`, `theme`.
