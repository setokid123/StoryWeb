# WP1 — Port giao diện StoryWeb sang WordPress (bước 1) — 2026-10-10

Nhánh `claude/wp-port`. Người dùng yêu cầu chuyển StoryWeb sang WordPress theo thứ tự:
1. port giao diện;
2. tìm plugin cho từng chức năng, chỉ code phần không có plugin;
3. port ngay trong repo này, xong phần nào xóa code cũ phần đó.

Đây là bước 1. **Không merge vào `main`**: Railway deploy `main` như một service Next.js, và nhánh này đã xóa giao diện Next.js.

## Kết quả

- **Theme `wp-content/themes/thu-cac`**
  - Các trang: trang chủ, Khám phá `/tim-kiem/`, thể loại `/the-loai/<slug>/`, truyện `/truyen/<slug>/`, trang đọc `/doc/<slug>/<n>/`, Tủ truyện `/tu-truyen/`, 404. URL giữ như bản Next.js.
  - Markup và chữ tiếng Việt giữ nguyên. `globals.css` và `dark-overrides.css` chuyển sang không sửa nội dung; `wp.css` chỉ thêm phần riêng của WordPress.
  - JS thuần dạng module: theme, tùy chỉnh đọc, toolbar/dock theo cuộn, danh sách chương, cổng khóa, tủ truyện. Giữ nguyên khóa localStorage cũ.
- **Plugin `wp-content/plugins/storyweb-core`**
  - Kiểu nội dung `story`/`chapter` (chương = `post_parent` + `menu_order`), taxonomy `the_loai`, meta truyện.
  - Đường dẫn `/doc/`, kèm 404 thật cho mọi đường dẫn sai dưới `/doc/`.
  - **Khóa chương ở server, mặc định khóa**: chỉ trả chương miễn phí cho tới khi port module mở khóa.
  - Chặn văn bản chương qua REST, feed, tìm kiếm, oEmbed/embed, sitemap. Đặt `noindex` và `no-store` cho trang đọc.
  - Ô nhập trong wp-admin. Luật đường dẫn tự flush khi đổi phiên bản.
- **Quy mô lớn**
  - Tìm kiếm phân trang ở DB, gồm cả tên tác giả. Bản Next.js nạp cả kho rồi lọc trong bộ nhớ.
  - Danh sách chương 100/trang.
  - Danh sách chương trong trang đọc chỉ tải qua REST khi mở.
  - Số chương lưu sẵn trong meta, không đếm lại mỗi lần.
- **Đã xóa**: giao diện React công khai (26 file) và `src/lib/reader-{preferences,scroll}.ts`. 20 unit test cũ chạy trên `reader-core.js`.

## Kiểm tra

- WordPress 7.1.3 tiếng Việt, PHP 8.3 qua WordPress Playground CLI 3.1.57 (local, SQLite). Cách chạy: [scripts/wp/README.md](../../scripts/wp/README.md).
- `scripts/wp/check-content.mjs` **43/43**:
  - 8 truyện mẫu, tìm theo tên và tác giả, lọc thể loại (cả link kiểu cũ);
  - 120 chương chia trang 100 + 20;
  - chương 1 đọc được, chương 2 không có thân bài;
  - không lộ mã chương khóa qua 18 đường: REST chapter/search/posts/`rest_route`, feed, `?s=`, `?p=`, embed, oEmbed, sitemap, comments feed.
- `scripts/wp/check-browser.mjs` **46/46** (Chrome headless):
  - 6 trang × 1280/360 × Sáng/Tối không tràn ngang, theme áp trước khi vẽ;
  - migrate `storyweb:font-size`, bảng tùy chỉnh (mở, focus, Escape, reset, font/độ rộng/cỡ chữ áp vào thân chương);
  - toolbar/dock theo cuộn, danh sách 120 chương mở từ dock và trả focus đúng nút;
  - dock ẩn khi điều hướng cuối chương hiện;
  - cổng khóa giữ focus, Escape về trang truyện;
  - tủ truyện, menu mobile; không có lỗi JS.
- `scripts/wp/check-admin.mjs` **11/11**:
  - danh sách Truyện;
  - "Thêm chương" chọn sẵn truyện và số 7, xuất bản xong chương hiện ở `/doc/…/7/`, khóa với khách, admin xem trước được;
  - trang truyện tự lên "7 chương";
  - ô "Thông tin truyện" trong trình sửa khối;
  - không có lỗi PHP.
- `npm run test:unit` **36/36**. `WP_DEBUG` bật, không có cảnh báo PHP trên 12 đường dẫn.
- **Ảnh**: `screenshots/wp1-*.png`. So với web Next.js hiện tại, bố cục trùng khớp.
  - Ba khác biệt đầu tiên đã sửa: ô trích dẫn quá rộng (thêm trường "Câu trích dẫn" + `max-width`), biểu tượng bìa (trường "Biểu tượng bìa"), thứ tự thể loại (theo thứ tự tạo).

## Còn lại (bước sau)

- **Bước 2**: chọn plugin cho quảng cáo, cache, nhập hàng loạt, SEO, sao lưu, bảo mật, chống bot. Chỉ code phần không có plugin.
- **Port logic còn trong `src/`**:
  - mở khóa bằng link (cookie HMAC 5 phút, `unlock_revision`, Fetch Metadata, **thêm rate limit** theo SEC1);
  - rewarded (fail-closed);
  - cài đặt Quảng cáo & mở khóa;
  - tài khoản (dùng user WordPress);
  - chuyển dữ liệu từ PostgreSQL.
- **Hạ tầng WordPress production** (PHP + MySQL), rồi mới tính chuyển domain. Thông báo "Bài viết đã được xuất bản" trong wp-admin còn dùng nhãn chung.

Context7/Memory: hai MCP server không kết nối trong phiên này; dùng tài liệu chính thức của WordPress và chạy thử trực tiếp.
