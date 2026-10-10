# Plugin cho Thư Các

Nguyên tắc: việc gì có plugin tốt thì dùng plugin; chỉ tự code khi không có plugin phù hợp hoặc plugin làm lộ chương khóa. Cài từ **wp-admin → Plugin → Cài mới**, tìm đúng tên bên dưới. Trên Railway, plugin nằm trên volume nên deploy lại không mất.

**Plugin đụng tới nội dung hoặc trang đọc** (SEO, cache, quảng cáo...) phải được thử trên WordPress chạy thử với `scripts/wp/check-content.mjs` trước khi lên site thật. Plugin có thể đọc thẳng nội dung chương mà không qua lớp khóa của StoryWeb Core.

## Nhóm 1: cài ngay (không đụng nội dung chương)

| Plugin | Để làm gì | Cài đặt |
| --- | --- | --- |
| **Limit Login Attempts Reloaded** | Chặn dò mật khẩu ở trang đăng nhập và XML-RPC | Mặc định là đủ. Trên Railway cần bản deploy có `apache-railway.conf`, nếu không plugin thấy mọi người cùng một IP (của proxy) và khóa tất cả |
| **Two Factor** | Đăng nhập 2 lớp cho tài khoản admin | Hồ sơ → bật "Authenticator App" (Google Authenticator...), lưu mã dự phòng |
| **FluentSMTP** | Cho site gửi được email (quên mật khẩu, thông báo) | Kết nối **Brevo** (miễn phí 300 mail/ngày) bằng API key, rồi gửi mail thử |
| **UpdraftPlus** | Sao lưu tự động ra Google Drive | Database hằng ngày, file hằng tuần, giữ khoảng 14 bản |
| **WordPress Importer** | Nhập truyện từ file WXR (Công cụ → Nhập → WordPress) | Xem mục "Nhập truyện" bên dưới |

## Nhóm 2: đụng tới nội dung, đã thử với chương khóa

Đã thử ngày 2026-10-10 trên WordPress chạy thử (PHP 8.3, WordPress 7.1.3) với Yoast SEO 28.6, WP Super Cache 3.1.4 (chưa bật cache) và Ad Inserter 2.8.19 cùng bật, trên 241 truyện thật nhập qua WXR. `check-import.mjs` đạt 68/68: chương khóa không lộ qua trang, `<head>`, REST, tìm kiếm, feed hay sitemap. `check-content.mjs` (dữ liệu mẫu) mới chạy khi chưa có các plugin này. Lần thử này phát hiện Yoast đưa mọi chương vào sitemap riêng của nó. StoryWeb Core giờ chặn việc đó (`wpseo_sitemap_exclude_post_type`).

| Plugin | Để làm gì | Cài đặt |
| --- | --- | --- |
| **Yoast SEO** | SEO trang chủ, truyện, thể loại; sitemap; xác minh Search Console | Không cần chỉnh cho chương: StoryWeb Core giữ chương `noindex` và ngoài sitemap của Yoast. Ảnh khi gửi link thì theme đã tự làm (`inc/share.php`: ảnh chung của site, ảnh riêng từng truyện có bìa và tên); khi Yoast (hoặc Rank Math, SEOPress, AIOSEO) bật, theme nhường thẻ Open Graph cho plugin |
| **Ad Inserter** | Dán mã quảng cáo (AdSense hoặc mạng khác) vào 4 vị trí theme có sẵn; quản lý `ads.txt` | Chạy `scripts/wp/setup-ad-inserter.php` sau khi bật: block 1–4 nối sẵn vào 4 ô của theme (hook `thu_cac_ad_slot_home_feed`, `_story_detail`, `_reader_end`, `_search_results`), chỉ cần dán mã quảng cáo vào block. Theme tự thêm nhãn "Quảng cáo" và ẩn ô trống. Ô cuối chương chỉ có ở chương được đọc. Đã thử 2026-10-10 (bản 2.8.19, theme 0.2.8): `check-content.mjs` đạt, 4 ô hiện đúng chỗ, chương khóa không có quảng cáo |
| **WP Super Cache** (để sau) | Cache trang chủ, trang truyện, thể loại khi lượng đọc lớn | Trang đọc chương không bao giờ bị cache (StoryWeb Core đặt `DONOTCACHEPAGE`). Chưa thử khi bật cache: đăng chương mới có thể chưa hiện ngay trên trang truyện. Bật khi cần, sau khi thêm phần tự làm mới trang truyện |
| **Post Views Counter** | Đếm lượt xem. Theme hiện "lượt xem" của mỗi truyện = trang truyện + mọi chương (thẻ truyện, vé nổi bật, trang truyện) | Chạy `scripts/wp/setup-post-views.php` sau khi bật (hoặc tự chỉnh trong Cài đặt → Post Views Counter): đếm loại `story` + `chapter`, chế độ **JavaScript** (đếm đúng cả khi có cache), **không** hiển thị tự động. Không dùng widget/shortcode "bài xem nhiều" cho chương: nó có thể in đoạn trích. Đã thử 2026-10-10 (bản 1.8.0): `check-content.mjs` 52/52, REST của plugin chỉ trả số |
| **Site Kit by Google** (tùy chọn) | Google Analytics, Search Console | Không bật AdSense "Auto ads": Google sẽ tự chèn quảng cáo vào trang đọc và sát nút điều hướng |

Vị trí quảng cáo theo kế hoạch cũ (`docs/ADS_UNLOCK_PLAN.md`): không chen giữa đoạn văn của chương, không đặt sát nhóm nút điều hướng. `reader_end` chỉ hiện khi chương đã được phép đọc.

## Nhập truyện

1. Trên máy: `node scripts/wp/bot-to-wxr.mjs --out dist/wp/import <thư mục bot>...` tạo các file `thu-cac-import-NN.xml`, mỗi file khoảng 300 chương (xem `scripts/wp/README.md`).
2. wp-admin → **Công cụ → Nhập → WordPress** (lần đầu bấm "Cài đặt ngay" rồi "Chạy trình nhập"). Chọn file 01 → **Tải tập tin lên và nhập**.
3. Ở bước tác giả, chọn tài khoản admin của bạn cho "thu-cac-import". Không cần tick tải file đính kèm. Bấm **Gửi**.
4. Làm lần lượt với các file còn lại. Nếu một file dừng giữa chừng, tải lại đúng file đó: phần đã nhập sẽ được bỏ qua.

Nên nhập **trước khi cài Yoast SEO**: Yoast lập chỉ mục từng bài lúc lưu nên làm việc nhập chậm hẳn.

## Không phải plugin

- **Cloudflare (gói Free)** khi gắn domain riêng: lớp chống bot/cào chính. Chặn trước khi request tới Railway nên đỡ tốn tiền. Thêm giới hạn tần suất cho `/doc/*`, cache ảnh/CSS/JS.
- **Railway Backups** cho volume `wordpress` và `MySQL` (xem `deploy/railway-wp/README.md`).

## Tự code (không có plugin phù hợp)

1. **Mở khóa bằng link** — đã làm (`storyweb-core/inc/unlock.php`, trang **Truyện → Mở khóa chương**: tối đa 10 link chọn ngẫu nhiên, nội dung cửa sổ, ảnh, thời gian đọc), kèm giới hạn tần suất theo `docs/reviews/SEC1_OWASP_REVIEW_2026-10-09.md`. Các plugin "content locker" chỉ ẩn nội dung bằng JavaScript, nội dung vẫn nằm trong HTML.
2. **Nhập chương hàng loạt**: dán hoặc tải file `.txt`, tự tách theo "Chương N", tạo chương đúng truyện và đúng số. Dùng tiếp cho việc **chuyển truyện từ database cũ**.
3. **Đăng truyện lên Page Facebook** — đã làm (`storyweb-core/inc/facebook.php`, trang **Truyện → Đăng Facebook**): ảnh bìa + giới thiệu, đoạn mở đầu hoặc cả một chương miễn phí + link đọc tiếp, đăng ngay hoặc hẹn giờ, kèm bình luận đầu tiên theo mẫu (link đọc tiếp chuyển xuống bình luận; cần quyền `pages_manage_engagement`). Plugin đăng mạng xã hội (Blog2Social, FS Poster…) chỉ đăng link bài viết, không lấy được chữ chương và không biết chương nào bị khóa.
4. **Quảng cáo có thưởng**: giữ tắt cho tới khi có nhà cung cấp web xác minh được phía máy chủ.
5. Sau này, nếu cần tài khoản độc giả và tủ truyện đồng bộ: đăng nhập Google/Facebook bằng **Nextend Social Login**, phần tủ truyện tự code.

## Không cài

- **Jetpack**: đồng bộ nội dung bài viết (cả chương) lên máy chủ WordPress.com.
- **Plugin bài liên quan** (YARPP...) và **plugin tìm kiếm thay thế** (Relevanssi, SearchWP): lập chỉ mục và đoạn trích từ nội dung chương.
- **Content locker / social locker**: ẩn bằng JavaScript, không phải khóa thật.
- **Rank Math, The SEO Framework**: tự tạo mô tả từ nội dung bài. Chưa thử với cơ chế khóa; nếu muốn đổi sang thì phải thử lại bằng `check-content.mjs`.
- **Wordfence**: tường lửa chạy ở mỗi request và quét file định kỳ, tốn CPU/RAM. Railway tính tiền theo mức dùng, mà Cloudflare cộng Limit Login Attempts đã làm phần này nhẹ hơn.
- **LiteSpeed Cache**: cần máy chủ LiteSpeed, trong khi site chạy Apache.
- **Plugin quản lý file** (File Manager...): mở lại đường sửa code từ wp-admin, vốn đã bị tắt.
