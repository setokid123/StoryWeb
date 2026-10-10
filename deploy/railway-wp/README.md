# WordPress trên Railway (theme Thư Các + plugin StoryWeb Core)

Một project Railway gồm hai service:

- **wordpress**: build từ repo này, nhánh `main`. File `railway.json` ở gốc repo chỉ Railway dùng `deploy/railway-wp/Dockerfile` (image WordPress chính thức, PHP 8.3, Apache, có sẵn theme và plugin). **Volume gắn tại `/var/www/html`** giữ toàn bộ site: lõi WordPress, `wp-config.php`, plugin/giao diện cài thêm, gói ngôn ngữ, ảnh tải lên.
- **MySQL**: database của Railway.

Mỗi lần deploy, theme `thu-cac` và plugin `storyweb-core` trên volume được thay bằng bản trong image (tức là code trong git). Mọi thứ khác trên volume giữ nguyên.

## Tạo bằng dashboard Railway

1. **New Project → Deploy from GitHub repo** → `setokid123/StoryWeb`, nhánh `main`. Railway đọc `railway.json` nên tự dùng đúng Dockerfile, không cần chỉnh Root Directory hay Dockerfile Path.
2. Trong project: **+ New → Database → MySQL**.
3. Service wordpress → **Variables** (đổi `MySQL` thành tên service database nếu khác):
   ```
   WORDPRESS_DB_HOST=${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}
   WORDPRESS_DB_USER=${{MySQL.MYSQLUSER}}
   WORDPRESS_DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   WORDPRESS_DB_NAME=${{MySQL.MYSQLDATABASE}}
   PORT=8080
   ```
4. Service wordpress → **Volume**, mount path `/var/www/html`.
5. Service wordpress → **Settings → Networking → Generate Domain**, port `8080`.

Bằng CLI (`npx @railway/cli`, đã đăng nhập), chạy trong một thư mục trống để không link nhầm project khác. Trên Git Bash, đặt `MSYS_NO_PATHCONV=1` để `/var/www/html` không bị đổi thành đường dẫn Windows:

```bash
railway init --name thu-cac-wp
railway add --database mysql
railway add --service wordpress --repo setokid123/StoryWeb --branch main \
  --variables 'WORDPRESS_DB_HOST=${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}' \
  --variables 'WORDPRESS_DB_USER=${{MySQL.MYSQLUSER}}' \
  --variables 'WORDPRESS_DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}' \
  --variables 'WORDPRESS_DB_NAME=${{MySQL.MYSQLDATABASE}}' \
  --variables 'PORT=8080'
railway volume add --service wordpress --mount-path /var/www/html
railway domain --service wordpress --port 8080
```

## Cài WordPress: làm ngay sau lần deploy đầu

Khi chưa cài, **ai mở được domain cũng cài được và chiếm site**. Vì vậy, khi domain chạy, mở nó và cài luôn:

1. Chọn **Tiếng Việt**, đặt tên site. Tên đăng nhập **không** đặt `admin`; dùng mật khẩu mạnh và email thật.
2. **Plugin**: kích hoạt **StoryWeb Core**. **Giao diện → Giao diện**: kích hoạt **Thư Các**. Cả hai có sẵn, không cần tải lên.
3. **Cài đặt → Đường dẫn tĩnh**: chọn "Tên bài viết" → Lưu.
4. **Cài đặt → Chung**: múi giờ "Hồ Chí Minh".
5. Đăng truyện theo `docs/WORDPRESS_DEPLOY.md` (mục 7–10).

Nếu mở domain mà thấy site **đã cài** dù bạn chưa cài: xóa service và volume, tạo lại.

## Cập nhật

- **Theme/plugin của mình**: push lên `main`, Railway build lại và thay bản trên volume. Truyện, chương, ảnh không mất vì nằm trong MySQL và volume.
- **Lõi WordPress, plugin/giao diện khác**: cài và cập nhật trong wp-admin như hosting thường. Chúng nằm trên volume nên deploy lại không mất.
- Mỗi lần deploy, site gián đoạn vài chục giây vì Railway không chạy hai bản cùng lúc trên một volume.

## Cấu hình trong thư mục này

- `wp-config-railway.php`: nhận HTTPS sau proxy của Railway (tránh lặp chuyển hướng); đặt địa chỉ site theo `SITE_DOMAIN`, nếu không có thì theo domain Railway; cho WordPress cài plugin không cần FTP; tắt trình sửa code PHP trong wp-admin. File được nạp qua biến `WORDPRESS_CONFIG_EXTRA` (xem `entrypoint.sh`). Nếu tự đặt biến này trong Railway, nó thay toàn bộ file.
- `php.ini`: tải lên tối đa 32 MB, bộ nhớ 256 MB.
- `entrypoint.sh`: cho Apache nghe cổng `$PORT`, thay theme/plugin trên volume bằng bản trong image.

## Domain riêng

Service wordpress → **Settings → Networking → Custom Domain**, trỏ DNS theo hướng dẫn của Railway. Sau đó thêm biến `SITE_DOMAIN=truyen.tenmien.com` (không có `https://`) để WordPress dùng domain này.

## Lưu ý

- **Email**: image không gửi được mail (quên mật khẩu, thông báo). Khi cần, cài một plugin SMTP.
- **Sao lưu**: bật lịch backup cho volume của wordpress và MySQL (tab **Backups** của từng service, nếu gói có).
- **Chi phí**: hai service chạy 24/7 tính vào gói. Theo dõi **Usage**.
