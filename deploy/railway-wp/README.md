# Chạy bản WordPress (theme Thư Các + plugin StoryWeb Core) trên Railway

WordPress chạy như **một service riêng**, không đụng service Next.js StoryWeb đang chạy. Theme và plugin được **nhúng sẵn trong Docker image** (deploy từ git), chỉ **media** (ảnh bìa, ảnh tải lên) cần một Volume.

> Nhắc lại: bản WordPress là bước WP1 — chưa có mở khóa bằng link, chưa chuyển dữ liệu, chưa quảng cáo. Dùng để chạy thử. Giữ service StoryWeb Next.js làm production cho tới khi port xong.

## Ba thành phần cần tạo trong Railway (phần này bạn tự bấm — mình không đăng nhập hộ)

Nên tạo trong **một project riêng** (ví dụ "ThuCac-WP") để tách hẳn khỏi project StoryWeb.

### 1. Service WordPress (từ Dockerfile này)
- New → **Deploy from GitHub repo** → chọn repo `setokid123/StoryWeb`, nhánh `claude/wp-port`.
- Trong **Settings** của service:
  - **Dockerfile Path**: `deploy/railway-wp/Dockerfile`
  - **Root Directory**: để trống (build context là gốc repo, vì Dockerfile cần copy `wp-content/`).
- Chưa deploy vội — thêm MySQL và biến môi trường trước.

### 2. Database MySQL
- Trong project: New → **Database → Add MySQL**.
- Railway tự tạo các biến `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.

### 3. Volume cho media
- Mở service WordPress → tab **Volumes** → **New Volume**.
- **Mount path**: `/var/www/html/wp-content/uploads`
- Không có volume thì ảnh bìa/ảnh tải lên **mất mỗi lần deploy**.

## Biến môi trường của service WordPress

Vào service WordPress → **Variables**, thêm (dùng cú pháp tham chiếu `${{MySQL.*}}` của Railway — đổi `MySQL` thành đúng tên service database của bạn nếu khác):

```
WORDPRESS_DB_HOST=${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}
WORDPRESS_DB_USER=${{MySQL.MYSQLUSER}}
WORDPRESS_DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
WORDPRESS_DB_NAME=${{MySQL.MYSQLDATABASE}}
WORDPRESS_CONFIG_EXTRA=if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') { $_SERVER['HTTPS'] = 'on'; } if (getenv('RAILWAY_PUBLIC_DOMAIN')) { define('WP_HOME', 'https://' . getenv('RAILWAY_PUBLIC_DOMAIN')); define('WP_SITEURL', 'https://' . getenv('RAILWAY_PUBLIC_DOMAIN')); } define('FS_METHOD', 'direct');
```

- `WORDPRESS_CONFIG_EXTRA` làm 3 việc: nhận biết HTTPS sau proxy Railway (tránh lặp chuyển hướng), tự đặt địa chỉ site theo domain Railway, và cho WordPress ghi file không cần FTP.

## Deploy và cài

1. Service WordPress → **Settings → Networking → Generate Domain** (lấy `*.up.railway.app`).
2. **Deploy**. Lần đầu Railway build image (vài phút). Mở domain.
3. Chạy trình cài WordPress (chọn ngôn ngữ, tạo tài khoản admin — **đừng** đặt tên `admin`, mật khẩu mạnh).
4. **Giao diện → Giao diện**: kích hoạt **Thư Các**. **Plugin**: kích hoạt **StoryWeb Core**. (Cả hai đã có sẵn trong image, chỉ cần bật.)
5. **Cài đặt → Đường dẫn tĩnh**: "Tên bài viết" → Lưu.
6. Thêm thể loại, truyện, chương như trong `docs/WORDPRESS_DEPLOY.md` (mục 7–10).

## Cập nhật sau này

Sửa theme/plugin → commit lên nhánh `claude/wp-port` → Railway tự build lại. Nội dung (truyện, chương, media) **không mất**: nằm trong MySQL và Volume, không nằm trong image.

**Thêm plugin khác**: thêm vào `deploy/railway-wp/Dockerfile` (COPY vào `wp-content/plugins/...`) rồi deploy — **đừng** cài qua wp-admin, vì image không ghi đè được và sẽ mất khi deploy lại.

## Lưu ý

- Dockerfile này **chưa build thử trên máy** (máy không có Docker). Lần build đầu trên Railway là lần kiểm thật; nếu lỗi, xem log build trên Railway và gửi mình.
- **Chi phí**: service WordPress + MySQL + Volume chạy 24/7 sẽ ăn vào gói $20. Theo dõi phần Usage của Railway.
- `WP_HOME`/`WP_SITEURL` tự bám domain Railway. Khi gắn **domain riêng**, đổi biến `RAILWAY_PUBLIC_DOMAIN` trong đoạn trên sang domain đó, hoặc sửa trong **Cài đặt → Chung**.
