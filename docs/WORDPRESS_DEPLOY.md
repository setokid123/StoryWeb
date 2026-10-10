# Deploy bản WordPress (theme Thư Các + plugin StoryWeb Core)

## Trạng thái hiện tại — đọc trước

Bản WordPress (bước WP1) đã có:
- giao diện;
- truyện/chương, thể loại;
- khóa chương phía máy chủ;
- trang quản trị để đăng truyện.

**Chưa có:**
- mở khóa bằng link (chương khóa hiện thông báo "tạm tắt");
- chuyển dữ liệu truyện từ bản cũ;
- quảng cáo, cache, chống bot.

Hướng dẫn này dành cho **hosting cPanel** (tải zip lên wp-admin). Deploy lên **Railway** thì xem [deploy/railway-wp/README.md](../deploy/railway-wp/README.md): theme và plugin có sẵn trong image, chỉ cần kích hoạt rồi làm tiếp từ mục 7 dưới đây.

## Yêu cầu hosting

- Hosting **PHP + MySQL/MariaDB** chạy WordPress.
- PHP **≥ 8.1** (đã thử 8.1 và 8.3), WordPress **≥ 6.5** (đã thử 7.1.3).
- HTTPS.

**Không cài vào một site WordPress đang dùng cho việc khác**: kích hoạt theme sẽ thay toàn bộ giao diện site đó. Nên tạo WordPress mới trên subdomain riêng, ví dụ `truyen.<domain>`.

## Đóng gói

```bash
node scripts/wp/package.mjs   # dist/wp/thu-cac.zip, dist/wp/storyweb-core.zip (từ commit hiện tại, đuôi dòng LF)
```

## Cài lần đầu

1. Trong trang quản trị hosting: tạo subdomain, cài WordPress (Softaculous/Installatron/"1-click WordPress"). Tên đăng nhập admin **không** đặt là `admin`; dùng mật khẩu mạnh.
2. Bật SSL (Let's Encrypt của hosting, hoặc Cloudflare ở chế độ SSL "Full (strict)").
3. **Cài đặt → Chung**: Ngôn ngữ "Tiếng Việt", múi giờ "Hồ Chí Minh".
4. **Cài đặt → Đường dẫn tĩnh**: chọn "Tên bài viết" → Lưu thay đổi.
5. **Plugin → Cài mới → Tải plugin lên**: chọn `storyweb-core.zip` → Cài đặt → **Kích hoạt**. Kích hoạt plugin trước theme.
6. **Giao diện → Giao diện → Thêm mới → Tải giao diện lên**: chọn `thu-cac.zip` → Cài đặt → Kích hoạt.
7. **Truyện → Thể loại**: tạo thể loại. Thứ tự tạo là thứ tự hiển thị.
8. **Truyện → Thêm truyện**:
   - nhập tên, mô tả, ảnh đại diện (bìa), thể loại, thẻ;
   - điền ô "Thông tin truyện": tác giả, số chương miễn phí, biểu tượng bìa, câu trích dẫn, nổi bật;
   - Xuất bản.
9. **Truyện → Tất cả truyện → "Thêm chương"** (link dưới tên truyện): truyện được chọn sẵn và số chương tự điền. Nhập tiêu đề, nội dung → Xuất bản.
10. Kiểm tra:
    - `/`, `/tim-kiem/`, `/truyen/<slug>/`;
    - `/doc/<slug>/1/` đọc được;
    - `/doc/<slug>/2/` hiện khung khóa và **không** có nội dung chương khi xem ở cửa sổ ẩn danh. Admin đang đăng nhập vẫn xem được chương khóa (chế độ xem trước của biên tập).
11. Tùy chọn: **Giao diện → Tùy biến → Thư Các** để đặt email liên hệ ở chân trang.

## Cập nhật bản mới

Sao lưu trước. Chạy lại `node scripts/wp/package.mjs`, rồi tải zip lên như lần đầu. WordPress hỏi có thay bản đang cài không: chọn **Thay thế bản hiện tại bằng bản tải lên**. Nội dung (truyện, chương, cài đặt) không bị ảnh hưởng. Luật đường dẫn tự cập nhật, không cần lưu lại "Đường dẫn tĩnh".

## Chưa làm (bước sau)

- **Chọn plugin**: quảng cáo, cache, sao lưu, bảo mật/chống bot, SEO, nhập truyện hàng loạt.
- **Port phần còn lại**: mở khóa bằng link (thêm rate limit theo SEC1), rewarded (giữ fail-closed), cài đặt Quảng cáo & mở khóa, chuyển dữ liệu từ PostgreSQL.
- **Gắn domain chính**: chỉ làm sau khi bước trên xong và đã kiểm tra.
