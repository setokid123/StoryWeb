# Vận hành Trạm Truyện 2D: sửa code, thử, deploy, xem và sửa dữ liệu trên Railway

Tài liệu này dành cho người tiếp quản dự án. Đọc từ trên xuống một lần, sau đó dùng các mục như sổ tay.

> Repo `setokid123/StoryWeb` **công khai trên GitHub**. Không bao giờ commit mật khẩu, token Facebook, khóa SSH, biến môi trường Railway hay mã máy chủ vào repo hoặc vào tài liệu này.

## 1. Bức tranh chung

```
 Máy bạn                                 GitHub (main)            Railway (project thu-cac-wp)
 ─────────                               ──────────────           ─────────────────────────────
 sửa code ──► thử trên site Playground   git push ───────────►   build Docker image ──► service "wordpress"
             (WordPress chạy trong Node,                          (theme + plugin trong   │  volume /var/www/html
              dữ liệu mẫu, tắt là mất)                             image thay bản cũ)      │  (WordPress, ảnh, plugin)
                                                                                         └─► service "MySQL" (truyện,
 ssh + script PHP ─────────────────────────────────────────────►  chạy trong container       chương, cài đặt)
 (xem/sửa dữ liệu thật)
```

- **Code** gồm theme `wp-content/themes/thu-cac` (giao diện) và plugin `wp-content/plugins/storyweb-core` (logic: truyện/chương, khóa chương, mở khóa bằng link, đăng Facebook, thống kê). Quy tắc nằm trong `CLAUDE.md`.
- **Deploy** = push lên nhánh `main`. Railway tự build và thay theme/plugin trên volume. Truyện, chương, ảnh và cài đặt nằm trong MySQL và volume nên không mất khi deploy.
- **Dữ liệu thật** không có phpMyAdmin. Muốn xem hay sửa hàng loạt thì SSH vào container rồi chạy script PHP có nạp WordPress (mục 5). Sửa lẻ từng truyện thì dùng wp-admin như bình thường.

## 2. Chuẩn bị máy (làm một lần)

Hướng dẫn viết cho Windows và **Git Bash**. Trên macOS hay Linux thì làm y hệt, bỏ phần `MSYS_NO_PATHCONV`.

1. Cài **Git for Windows** (có Git Bash và OpenSSH), **Node.js 22**, **Google Chrome** (bộ kiểm tra trình duyệt dùng Chrome ẩn).
2. Lấy code:
   ```bash
   git clone https://github.com/setokid123/StoryWeb.git
   cd StoryWeb
   npm test          # 21 kiểm tra logic trang đọc, không cần cài gì thêm
   ```
3. **Railway**: chủ project mời bạn vào project `thu-cac-wp` (Railway → Project Settings → Members). Đăng nhập CLI:
   ```bash
   npx -y @railway/cli@latest login
   ```
   Trong Git Bash, đặt `MSYS_NO_PATHCONV=1` trước các lệnh Railway có đường dẫn kiểu `/var/www/html`, nếu không Git Bash đổi nó thành đường dẫn Windows.
4. **Không để công cụ trong thư mục Temp** của Windows. Windows có thể tự dọn Temp và làm mất site thử. Đặt chúng cạnh repo, ví dụ `../wp-tools`.

## 3. Sửa code và thử trên máy

### 3.1 Bật site thử (WordPress Playground)

Cài một lần (ngoài repo):

```bash
mkdir -p ../wp-tools && (cd ../wp-tools && npm init -y >/dev/null && npm i @wp-playground/cli@3.1.57)
```

Bật site từ thư mục gốc repo:

```bash
MSYS_NO_PATHCONV=1 node ../wp-tools/node_modules/@wp-playground/cli/wp-playground.js server --port=9400 --php=8.3 \
  --blueprint=scripts/wp/blueprint-dev.json \
  --mount-dir "$PWD/wp-content/themes/thu-cac" /wordpress/wp-content/themes/thu-cac \
  --mount-dir "$PWD/wp-content/plugins/storyweb-core" /wordpress/wp-content/plugins/storyweb-core \
  --mount-dir "$PWD/scripts/wp" /seed \
  --define-bool WP_DEBUG true
```

- Mở http://127.0.0.1:9400. Đăng nhập wp-admin bằng `admin` / `password` (tài khoản mặc định của site thử, **chỉ** dùng ở máy).
- `blueprint-dev.json` dựng site đầy đủ cho mọi bộ kiểm tra:
  - 8 truyện mẫu, ảnh bìa mẫu (`seed-covers.php`), mã truyện TT2D1…TT2D8;
  - plugin Post Views Counter cùng lượt xem mẫu;
  - mock Facebook (`mock-facebook.php`, trả lời thay Facebook, **không bao giờ** cài lên web thật).
- Theme và plugin được "mount" từ thư mục repo: sửa file là site thử thấy ngay, không cần khởi động lại.
- Tắt server là site thử mất hết dữ liệu. Lần sau bật lại sẽ có site mới tinh.

### 3.2 Chạy kiểm tra

```bash
npm test                                                                   # logic trang đọc
node scripts/wp/check-content.mjs                                          # chương khóa không lộ, tìm kiếm, xếp hạng
OUT="$PWD/../shots" node scripts/wp/check-browser.mjs                      # giao diện trên Chrome ẩn, ảnh 1280/360
WP_TEST_USER=admin WP_TEST_PASS=password OUT="$PWD/../shots" node scripts/wp/check-admin.mjs
WP_TEST_USER=admin WP_TEST_PASS=password node scripts/wp/check-unlock.mjs
WP_TEST_USER=admin WP_TEST_PASS=password node scripts/wp/check-facebook.mjs
```

- `check-unlock`, `check-facebook`, `check-admin` cần **site mới tinh**, vì chúng thay đổi cài đặt. Tắt site, bật lại, rồi chạy. Mỗi lần nên chạy một bộ.
- Duyệt site thử nhiều lần sẽ cộng thêm lượt xem, làm 3 kiểm tra xếp hạng trong `check-content` trượt. Nạp lại lượt xem mẫu bằng cách chạy `scripts/wp/seed-views.php` (xem `scripts/wp/README.md`) hoặc bật lại site.
- Sửa nội dung truyện/chương, khóa chương, REST, RSS… thì **bắt buộc** chạy `check-content.mjs`. Đó là kiểm tra chống lộ chương khóa.

### 3.3 Đẩy lên (deploy)

1. Làm trên một nhánh, commit, gộp vào `main` rồi push:
   ```bash
   git checkout -b ten-viec
   # … sửa, kiểm tra …
   git commit -am "Mô tả ngắn"
   git checkout main && git merge --ff-only ten-viec && git push origin main
   ```
2. Sửa CSS/JS thì **tăng số phiên bản** để trình duyệt tải file mới:
   - theme: `THU_CAC_VERSION` trong `functions.php` và dòng `Version:` trong `style.css`;
   - plugin: `STORYWEB_CORE_VERSION` và dòng `Version:` trong `storyweb-core.php`.
3. Railway build mất khoảng 2–4 phút. Kiểm tra bản mới đã lên chưa:
   ```bash
   curl -s https://tramtruyen2d.up.railway.app/ | grep -o 'tram.css?ver=[0-9.]*'
   ```
4. Xem log của bản đang chạy (Apache và PHP), tối đa 5.000 dòng mỗi lần:
   ```bash
   MSYS_NO_PATHCONV=1 npx -y @railway/cli@latest logs -s wordpress --lines 5000 > log.txt
   ```
   Lệnh này chạy trong thư mục đã link project (mục 4, bước 3). Log chỉ gồm lần deploy hiện tại.

## 4. Kết nối SSH vào máy chủ (làm một lần)

1. Tạo khóa SSH riêng cho máy bạn (nếu chưa có):
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -C "ten-may-cua-ban"
   ```
2. Đăng ký khóa với tài khoản Railway:
   ```bash
   npx -y @railway/cli@latest ssh keys add --key ~/.ssh/id_ed25519.pub --name ten-may-cua-ban
   ```
3. Link project trong **một thư mục trống** (không phải thư mục repo, vì repo có thể đang link với project cũ):
   ```bash
   mkdir -p ../railway-link && cd ../railway-link
   npx -y @railway/cli@latest link -p thu-cac-wp -s wordpress -e production
   ```
4. Thêm khối cấu hình SSH tên `thu-cac-wp` vào `~/.ssh/config`:
   ```bash
   npx -y @railway/cli@latest ssh config -s wordpress --alias thu-cac-wp -i ~/.ssh/id_ed25519
   ```
   Thêm `--dry-run` để xem trước khối cấu hình mà không ghi.
5. Thử:
   ```bash
   ssh thu-cac-wp 'php -v && ls /var/www/html/wp-content/plugins'
   ```
   Dùng `ssh` thường thay cho `railway ssh`, vì trên Windows `railway ssh` từng lỗi "Host key verification failed".

Cần gỡ quyền một máy thì dùng `railway ssh keys list` rồi `railway ssh keys remove`.

## 5. Xem và sửa dữ liệu thật bằng script PHP

### 5.1 Trong container có gì

- WordPress ở `/var/www/html`, chạy bằng user `www-data`. Có PHP CLI, **không** có WP-CLI hay `unzip`.
- Script phải chạy bằng `www-data` (`su -s /bin/sh -c 'php …' www-data`) để file nó tạo ra có đúng quyền.
- PHP CLI **không** nạp `wp-config-railway.php`. Vì vậy script phải tự khai báo `WP_HOME` và `WP_SITEURL`, nếu không link sinh ra sẽ trỏ về tên miền cũ. File mẫu đã làm sẵn việc này.

### 5.2 Quy trình (luôn theo đúng thứ tự)

1. **Chép file mẫu** `scripts/wp/server-script-template.php` thành file của bạn, đặt ngoài repo hoặc chỉ commit khi nó có ích lâu dài. Sửa 3 chỗ: chọn bài nào, đổi gì, báo cáo gì.
2. **Chạy thử** (chỉ đọc, in ra số bài sẽ đổi và vài mẫu):
   ```bash
   RAILWAY_SSH=thu-cac-wp scripts/wp/railway-php.sh my-script.php --dry
   ```
   `railway-php.sh` chép file lên `/tmp`, chạy bằng `www-data`, rồi **tự xóa** file đó kể cả khi lỗi.
3. **Đọc kỹ báo cáo.** Đối chiếu vài mẫu trước/sau. Sửa script và chạy thử lại tới khi đúng hẳn.
4. **Chạy thật** (sao lưu nội dung gốc rồi mới ghi):
   ```bash
   RAILWAY_SSH=thu-cac-wp scripts/wp/railway-php.sh my-script.php --apply
   ssh thu-cac-wp 'cat /tmp/sw-backup.json' > backup-$(date +%F).json
   ssh thu-cac-wp 'rm -f /tmp/sw-backup.json'
   ```
   Giữ file sao lưu ở máy, **không** commit (nó chứa nội dung truyện).
5. **Kiểm tra lại trên web**: mở vài trang vừa sửa, chạy lại script ở chế độ `--dry` (phải báo 0 bài cần đổi).

### 5.3 Quy tắc an toàn

- Không in ra màn hình hay ghi vào file: mật khẩu, token Page Facebook, giá trị trong `wp-config.php`, biến môi trường Railway.
- Truy vấn dùng `$wpdb->prepare`. Không chạy câu SQL xóa hàng loạt trực tiếp. Muốn xóa bài thì dùng `wp_delete_post` theo lô.
- Sửa nội dung bằng `$wpdb->update` rồi `clean_post_cache()`: ngày đăng và thứ tự truyện không đổi. `wp_update_post` sẽ đổi ngày cập nhật và chạy các hook (đếm chương, đăng Facebook…), chỉ dùng khi bạn muốn điều đó.
- Luôn sao lưu trước khi ghi. Xóa mọi file trong `/tmp` sau khi dùng: chúng có thể chứa nội dung chương khóa.
- Không đụng project Railway cũ tên **StoryWeb** (database của bản cũ).

### 5.4 Mẹo khi quét nội dung truyện

- **Quét 17.000 chương theo lô** (`LIMIT 1000` và `ID > lần trước`), chạy với `php -d memory_limit=512M`. `railway-php.sh` đã đặt sẵn mức này.
- **Tìm ký tự đặc biệt bằng PHP** (`preg_match` với cờ `/u`), không bằng `REGEXP` của MySQL: MySQL xử lý khoảng ký tự Unicode khác và dễ báo lỗi.
- Truyện chép từ web khác hay lẫn **ký tự vô hình**:
  - dấu cách không ngắt `U+00A0`: `\s` không bắt được, phải viết `[\s\x{00A0}]`;
  - ký tự icon của web cũ `U+E000–U+F8FF`, hiện thành ô vuông lỗi.
- Cắt chuỗi tiếng Việt bằng `mb_substr`, đừng dùng `substr`. Cắt giữa một chữ có dấu thì `json_encode` trả về rỗng.
- Ví dụ đã làm: đợt dọn ngày 18/10/2026 sửa 133 truyện/chương, gồm rác điều hướng của web cũ, 2 chương dính truyện khác và chữ Trung quên dịch. Mỗi chỗ được xem ngữ cảnh rồi mới đặt quy tắc. Chữ Trung cố ý, tên tác giả và ghi công nhóm dịch được giữ.

## 6. Lỗi thường gặp trên Windows

| Hiện tượng | Cách xử lý |
|---|---|
| Đường dẫn `/var/www/html` hay `/wordpress/...` thành `C:/Program Files/Git/...` | Đặt `MSYS_NO_PATHCONV=1` trước lệnh |
| Script viết bằng heredoc (`<<'EOF'`) bị mất dấu `\` | Ghi script ra file bằng trình soạn thảo rồi chạy file |
| File `.sh` lỗi `$'\r': command not found` | `.gitattributes` đã ép `*.sh` dùng LF. Nếu vẫn lỗi, mở file bằng trình soạn thảo và lưu lại với LF |
| Site thử hoặc công cụ tự nhiên biến mất | Thư mục Temp bị Windows dọn. Để công cụ ở `../wp-tools` (mục 3.1) |
| `railway logs --lines 50000` báo "Invalid input" | Tối đa 5.000 dòng mỗi lần |
| Bộ kiểm tra Facebook/mở khóa/wp-admin trượt hàng loạt ngay từ đầu | Site thử chưa mới tinh hoặc chưa dựng xong. Bật lại site, đợi trang `/xem-nhieu/` có bảng xếp hạng rồi chạy |
| Mỗi lần chụp màn hình để lại thư mục Chrome ~80 MB | Xóa thư mục `--user-data-dir` sau khi chụp |

## 7. Danh sách kiểm trước khi làm

**Trước khi push:**
- [ ] `npm test` và các bộ kiểm tra liên quan đều đạt (sửa nội dung hay khóa chương thì luôn có `check-content.mjs`).
- [ ] Đã tăng số phiên bản nếu sửa CSS/JS.
- [ ] Không có mật khẩu, token, khóa hay file sao lưu trong commit (`git diff --cached`).

**Trước khi sửa dữ liệu thật:**
- [ ] Đã chạy `--dry` và đọc báo cáo.
- [ ] Script sao lưu trước khi ghi, và bản sao lưu đã tải về máy.
- [ ] Không in bí mật ra màn hình. `/tmp` đã dọn.
- [ ] Đã mở lại web kiểm tra sau khi sửa.
