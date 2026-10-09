# Chạy thử WordPress (theme Thư Các + plugin StoryWeb Core) trên máy

Dùng [WordPress Playground CLI](https://github.com/WordPress/wordpress-playground) (WordPress chạy trong Node, PHP dạng WebAssembly, SQLite). Không cần cài PHP, MySQL hay Docker. Site tạm, dữ liệu mất khi tắt server.

## Chạy

Cài công cụ một lần, **ngoài repo** (khoảng 570 MB, không đụng `package.json`):

```bash
mkdir wp-tools && cd wp-tools && npm init -y && npm i @wp-playground/cli@3.1.57
```

Từ thư mục gốc repo (Git Bash cần `MSYS_NO_PATHCONV=1`, nếu không đường dẫn `/wordpress/...` bị đổi thành `C:/Program Files/Git/...`):

```bash
MSYS_NO_PATHCONV=1 <wp-tools>/node_modules/.bin/wp-playground-cli server --port=9400 --php=8.3 \
  --blueprint=scripts/wp/blueprint.json \
  --mount-dir "$PWD/wp-content/themes/thu-cac" /wordpress/wp-content/themes/thu-cac \
  --mount-dir "$PWD/wp-content/plugins/storyweb-core" /wordpress/wp-content/plugins/storyweb-core \
  --mount-dir "$PWD/scripts/wp" /seed \
  --define-bool WP_DEBUG true
```

Lần đầu mất khoảng 1 phút (tải WordPress và gói tiếng Việt). Mở http://127.0.0.1:9400. Sửa file theme/plugin có hiệu lực ngay (thư mục được mount).

Blueprint đặt tiếng Việt, đường dẫn `/%postname%/`, bật plugin + theme và nạp 8 truyện mẫu (`sample-stories.json`). Truyện đầu có 120 chương, các truyện khác 6 chương; chương 1 miễn phí. Mỗi chương có mã `SW-<slug>-<n>-BODY` để kiểm lộ nội dung.

Tài khoản quản trị của site tạm là tài khoản mặc định của Playground: `admin` / `password`. Chỉ dùng cho site local này.

## Kiểm tra

Chờ vài giây sau khi trang chủ trả 200 (dữ liệu mẫu nạp sau khi server mở cổng), rồi:

```bash
node scripts/wp/check-content.mjs     # 43 kiểm tra: số truyện, tìm kiếm, phân trang, chương khóa không lộ qua 18 đường
OUT=<thư mục ảnh> node scripts/wp/check-browser.mjs   # 46 kiểm tra trên Chrome headless + ảnh 1280/360, Sáng/Tối
WP_TEST_USER=admin WP_TEST_PASS=password OUT=<thư mục ảnh> node scripts/wp/check-admin.mjs   # 11 kiểm tra wp-admin
```

Ba script chỉ chạy với `127.0.0.1`. `check-browser.mjs` nhận thêm `PROD=<URL web Next.js>` để chụp ảnh đối chiếu (chỉ đọc).
