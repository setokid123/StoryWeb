# Plugin cho Thư Các

Nguyên tắc: việc gì có plugin tốt thì dùng plugin; chỉ tự code khi không có plugin phù hợp hoặc plugin làm lộ chương khóa. Cài từ **wp-admin → Plugin → Cài mới**, tìm đúng tên bên dưới. Trên Railway, plugin nằm trên volume nên deploy lại không mất.

**Plugin đụng tới nội dung hoặc trang đọc** (SEO, cache, quảng cáo...) phải được thử trên WordPress chạy thử với `scripts/wp/check-content.mjs` trước khi lên site thật. Plugin có thể đọc thẳng nội dung chương mà không qua lớp khóa của StoryWeb Core.

## Nhóm 1: cài ngay (không đụng nội dung chương)

| Plugin | Để làm gì | Cài đặt |
| --- | --- | --- |
| **Limit Login Attempts Reloaded** | Chặn dò mật khẩu ở trang đăng nhập và XML-RPC | Mặc định là đủ |
| **Two Factor** | Đăng nhập 2 lớp cho tài khoản admin | Hồ sơ → bật "Authenticator App" (Google Authenticator...), lưu mã dự phòng |
| **FluentSMTP** | Cho site gửi được email (quên mật khẩu, thông báo) | Kết nối **Brevo** (miễn phí 300 mail/ngày) bằng API key, rồi gửi mail thử |
| **UpdraftPlus** | Sao lưu tự động ra Google Drive | Database hằng ngày, file hằng tuần, giữ khoảng 14 bản |

## Nhóm 2: cài sau khi đã deploy bản vá và thử với chương khóa

| Plugin | Để làm gì | Cài đặt |
| --- | --- | --- |
| **Yoast SEO** | SEO trang chủ, truyện, thể loại; ảnh bìa khi chia sẻ Facebook; sitemap; xác minh Search Console | Loại nội dung **Chương**: tắt "Hiển thị trong kết quả tìm kiếm" (chương vốn đã `noindex`), để trống mẫu mô tả |
| **WP Super Cache** | Cache trang chủ, trang truyện, thể loại để chịu tải | Bật cache, chế độ Simple; giữ "Không cache cho người đã đăng nhập". Trang đọc chương không bao giờ bị cache (StoryWeb Core đặt `DONOTCACHEPAGE`) |
| **Ad Inserter** | Dán mã quảng cáo (AdSense hoặc mạng khác) vào 4 vị trí theme có sẵn; quản lý `ads.txt` | Tab **Hooks**: thêm 4 action `thu_cac_ad_slot_home_feed`, `thu_cac_ad_slot_story_detail`, `thu_cac_ad_slot_reader_end`, `thu_cac_ad_slot_search_results`. Mỗi block chọn chèn tự động vào hook tương ứng. Theme tự thêm nhãn "Quảng cáo" và ẩn chỗ trống |
| **Site Kit by Google** (tùy chọn) | Google Analytics, Search Console | Không bật AdSense "Auto ads": Google sẽ tự chèn quảng cáo vào trang đọc và sát nút điều hướng |

Vị trí quảng cáo theo kế hoạch cũ (`docs/ADS_UNLOCK_PLAN.md`): không chen giữa đoạn văn của chương, không đặt sát nhóm nút điều hướng. `reader_end` chỉ hiện khi chương đã được phép đọc.

## Không phải plugin

- **Cloudflare (gói Free)** khi gắn domain riêng: lớp chống bot/cào chính. Chặn trước khi request tới Railway nên đỡ tốn tiền. Thêm giới hạn tần suất cho `/doc/*`, cache ảnh/CSS/JS.
- **Railway Backups** cho volume `wordpress` và `MySQL` (xem `deploy/railway-wp/README.md`).

## Tự code (không có plugin phù hợp)

1. **Mở khóa bằng link** (port từ bản cũ) kèm giới hạn tần suất theo `docs/reviews/SEC1_OWASP_REVIEW_2026-10-09.md`. Các plugin "content locker" chỉ ẩn nội dung bằng JavaScript, nội dung vẫn nằm trong HTML.
2. **Nhập chương hàng loạt**: dán hoặc tải file `.txt`, tự tách theo "Chương N", tạo chương đúng truyện và đúng số. Dùng tiếp cho việc **chuyển truyện từ database cũ**.
3. **Quảng cáo có thưởng**: giữ tắt cho tới khi có nhà cung cấp web xác minh được phía máy chủ.
4. Sau này, nếu cần tài khoản độc giả và tủ truyện đồng bộ: đăng nhập Google/Facebook bằng **Nextend Social Login**, phần tủ truyện tự code.

## Không cài

- **Jetpack**: đồng bộ nội dung bài viết (cả chương) lên máy chủ WordPress.com.
- **Plugin bài liên quan** (YARPP...) và **plugin tìm kiếm thay thế** (Relevanssi, SearchWP): lập chỉ mục và đoạn trích từ nội dung chương.
- **Content locker / social locker**: ẩn bằng JavaScript, không phải khóa thật.
- **Rank Math, The SEO Framework**: tự tạo mô tả từ nội dung bài. Chưa thử với cơ chế khóa; nếu muốn đổi sang thì phải thử lại bằng `check-content.mjs`.
- **Wordfence**: tường lửa chạy ở mỗi request và quét file định kỳ, tốn CPU/RAM. Railway tính tiền theo mức dùng, mà Cloudflare cộng Limit Login Attempts đã làm phần này nhẹ hơn.
- **LiteSpeed Cache**: cần máy chủ LiteSpeed, trong khi site chạy Apache.
- **Plugin quản lý file** (File Manager...): mở lại đường sửa code từ wp-admin, vốn đã bị tắt.
