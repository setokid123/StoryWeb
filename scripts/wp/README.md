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

`bot-to-wxr.mjs` đổi thư mục kết quả của bot (`chapters/<truyện>/chuong-N.txt`, có thể kèm `stories.json` và `index.csv`) thành file WXR. Bạn nhập file này trong wp-admin → **Công cụ → Nhập → WordPress** (plugin WordPress Importer):

```bash
node scripts/wp/bot-to-wxr.mjs --out dist/wp/import [--free 1|all] [--completed] [--min-chars 2000] <thư mục bot>...
# ví dụ: --free 2 --completed chapter/output_full/nhatruyenhay chapter/output_truyentop chapter/output_zhihu
```

- Đưa mọi thư mục vào cùng một lần chạy: truyện trùng (cùng tên và cùng đoạn mở đầu, ở hai nguồn hoặc bot cào hai lần) chỉ giữ bản nhiều chữ hơn, gộp thể loại. Cùng tên mà khác nội dung thì giữ cả hai.
- Mỗi file khoảng 300 chương (`--max-chapters` để đổi). Một truyện và mọi chương của nó luôn nằm chung một file. Nhập lại cùng một file thì bỏ qua phần đã có; tạo lại file thì ngày đăng đổi, nhập lại sẽ thành bản trùng.
- `--free`: số chương miễn phí của mỗi truyện; `all` là mở hết. `--completed`: đánh dấu mọi truyện "Hoàn thành".
- `--min-chars`: chương ngắn hơn số ký tự này (mặc định 2000, khoảng 400 chữ) gộp vào chương trước (chương đầu thì gộp chương sau), rồi đánh số lại 1..N.
- Tên truyện lấy từ `title` trong `stories.json`: tên viết HOA cả câu đổi thành viết hoa chữ đầu (giữ CEO, ICU, NYC...), bỏ mã nguồn kiểu `#TOP_T 21` và chữ `FULL` ở cuối. Slug tạo từ tên (bỏ dấu). Thể loại lấy từ `categories`.
- Chưa có tên thật (bot chỉ lưu slug) thì tên tạm lấy từ slug, bỏ mã nguồn ở đầu (`top-166`, `ttop-1142`); mã lấy từ cột `chapter_title` của `index.csv` (`#TOP 166`) để không cắt nhầm số trong tên.
- Trang nguồn bọc từng chữ trong thẻ riêng nên bot ghi một đoạn thành nhiều dòng ngắn. Script ghép lại: xuống đoạn khi dòng trước hết câu và dòng sau bắt đầu câu mới. Tiêu đề chương bên trong ("Chương 3", `**…**`) và số mục in đậm, dòng ngăn cảnh thành `* * *`; `*nghiêng*` thành chữ nghiêng; đoạn dài quá 1200 ký tự được tách theo câu.
- Chữ bị che để lọt bộ lọc ("x/ác", "m.á.u", "tr..eo", "hànhz") được ghép lại khi từ ghép ra có trong chính kho truyện từ 3 lần; dấu `*` chỉ sửa các chữ rõ nghĩa (ch\*t, gi\*t, tự t\*, tự s\*t...), chửi thề che sao để nguyên. Bỏ link và dòng "Đọc full tại ..." của trang nguồn, header `CHAPTER_INDEX`/`DOMAIN`, thêm dấu cách thiếu sau dấu câu.
- Script báo số chương đã gộp, số truyện trùng đã bỏ, số truyện chưa có tên thật, số chương bị cắt vì popup của trang nguồn, và số truyện chưa có thể loại.

Để thử trên máy, mount thư mục file WXR vào `/import` và dùng bước `importWxr` của blueprint. Sau đó chạy `FREE=<số chương free> [COMPLETED=1] node scripts/wp/check-import.mjs <thư mục bot>...` (cùng các thư mục đã đưa cho `bot-to-wxr.mjs`): với khoảng 12 truyện, các chương free đọc được, chương kế tiếp khóa và không lộ chữ nào (trang, `<head>`, REST của Yoast, tìm kiếm, feed, sitemap).
