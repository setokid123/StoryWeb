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
node scripts/wp/check-content.mjs     # số truyện, tìm kiếm, phân trang; chương khóa không lộ qua 21 đường, kể cả <head> và đường của plugin SEO
OUT=<thư mục ảnh> node scripts/wp/check-browser.mjs   # 46 kiểm tra trên Chrome headless + ảnh 1280/360, Sáng/Tối
WP_TEST_USER=admin WP_TEST_PASS=password OUT=<thư mục ảnh> node scripts/wp/check-admin.mjs   # 11 kiểm tra wp-admin
```

Ba script chỉ chạy với `127.0.0.1`. `check-browser.mjs` nhận thêm `PROD=<URL web Next.js>` để chụp ảnh đối chiếu (chỉ đọc).

## Thử plugin ngoài

Plugin đụng tới nội dung hoặc trang đọc (SEO, cache, quảng cáo...) phải qua `check-content.mjs` trước khi cài lên site thật (xem `docs/PLUGINS.md`). `blueprint-plugins.json` giống `blueprint.json` nhưng cài thêm Yoast SEO, WP Super Cache và Ad Inserter từ wordpress.org: thay `--blueprint` trong lệnh trên rồi chạy lại các kiểm tra. Blueprint nạp truyện mẫu trước rồi mới cài plugin: có Yoast từ trước thì bước nạp rất chậm.

## Nhập truyện từ bot

`bot-to-wxr.mjs` đổi thư mục kết quả của bot (`chapters/<truyện>/chuong-N.txt`, có thể kèm `stories.json`) thành file WXR. Bạn nhập file này trong wp-admin → **Công cụ → Nhập → WordPress** (plugin WordPress Importer):

```bash
node scripts/wp/bot-to-wxr.mjs --out dist/wp/import [--free 1|all] <thư mục bot>...
```

- Mỗi file khoảng 300 chương. Một truyện và mọi chương của nó luôn nằm chung một file. Nhập lại cùng một file thì bỏ qua phần đã có.
- `--free`: số chương miễn phí của mỗi truyện; `all` là mở hết.
- Script báo số truyện chưa có tên thật (bot chỉ lưu slug), số chương bị cắt vì popup của trang nguồn, và số truyện chưa có thể loại.

Để thử trên máy, mount thư mục file WXR vào `/import` và dùng bước `importWxr` của blueprint. Sau đó chạy `node scripts/wp/check-import.mjs <thư mục bot>...`: với khoảng 12 truyện, chương 1 đọc được, chương 2 khóa và không lộ chữ nào (trang, `<head>`, REST của Yoast, tìm kiếm, feed, sitemap).
