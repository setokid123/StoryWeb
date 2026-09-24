# Thử luồng mở khóa link 5 phút (môi trường test, không phải production)

Mục tiêu: thử luồng "Nhấp liên kết" hiện có với đích `https://example.com/`, trên **database riêng**. Không cần code bypass: dùng đúng cấu hình và cài đặt admin như production. Không bật Shopee, không dùng provider rewarded mock.

## 1. Chuẩn bị

1. **Database riêng.** Dùng PostgreSQL local, hoặc tạo database mới (ví dụ `storyweb_test`) trên một server test. **Không** dùng database `railway` của production.
2. **`.env.local`** trong thư mục dự án (không commit):

   ```bash
   DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/storyweb_test
   ADMIN_PANEL_PASSWORD=<mật khẩu thử>
   ADMIN_SESSION_SECRET=<chuỗi ngẫu nhiên ≥ 32 ký tự>
   CLICK_UNLOCK_ENABLED=true
   CLICK_UNLOCK_SECRET=<chuỗi ngẫu nhiên ≥ 32 ký tự>
   CLICK_UNLOCK_URL=https://example.com/
   SHOPEE_GATE_APPROVED=false
   # Không đặt REWARDED_AD_PROVIDER, STORYWEB_ALLOW_MOCK_*
   ```

3. **Migration và chạy app:**

   ```bash
   npm ci
   npm run db:migrate
   npm run build
   npm start
   ```

   Mở `http://localhost:3000`. Có thể dùng `npm run dev`, nhưng `next start` giống production hơn.

## 2. Bật chế độ link

1. Vào `/panel`, đăng nhập bằng `ADMIN_PANEL_PASSWORD` (hoặc tài khoản `admin`).
2. Studio → **Quảng cáo & mở khóa** (`/panel/cai-dat`).
3. Bật **Bảo vệ chương khóa**, chọn **Nhấp liên kết**. Trạng thái phải là "Sẵn sàng". **Xem quảng cáo** phải là "Chưa cấu hình" vì không có provider.
4. Để trống ô URL (hệ thống dùng `CLICK_UNLOCK_URL`) rồi **Lưu thay đổi**. Dòng "Đang áp dụng" chuyển sang chế độ link, revision tăng 1.
5. Nếu cần một truyện có chương khóa, tạo truyện ở `/panel` với ít nhất 3 chương, "Số chương miễn phí" = 1, rồi xuất bản.

## 3. Kịch bản thử (trình duyệt)

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Mở chương 1 | Đọc được (miễn phí). |
| 2 | Mở chương 2 | Dialog khóa hiện nút **Mở liên kết giới thiệu**; không có nội dung chương. DevTools → Elements và tab Network (document + request `?_rsc`) **không chứa** thân chương 2. |
| 3 | Bấm nút | `example.com` mở trong **tab mới**; trang đọc không tự chuyển hướng hay bật popup. |
| 4 | Quay lại tab StoryWeb | Trang tự làm mới khi tab được focus, chương 2 hiện ra, có dòng "Đã mở quyền đọc… đến HH:MM". Cookie `storyweb_unlock` là HttpOnly, hạn 300 giây. |
| 5 | Bấm **Chương sau** trong 5 phút | Chương 3 đọc được, không phải bấm lại. |
| 6 | Chờ quá 5 phút, để yên trên chương đã mở | Khi hết hạn, nội dung bị gỡ khỏi DOM và dialog khóa hiện lại, kể cả khi mạng chậm. Tải lại trang: server không trả body. |
| 7 | Sau hết hạn, sang chương khóa khác | Phải bấm liên kết lại. |
| 8 | Trong khi còn hạn, admin tắt mở khóa hoặc đổi phương thức rồi lưu | Chương khóa bị khóa lại ngay ở request kế tiếp (revision mới làm grant cũ mất hiệu lực). |
| 9 | Nhập URL `https://shopee.vn/...`, `http://...` hoặc domain lạ rồi lưu | Bị từ chối, kèm lý do (Shopee cần chấp thuận riêng; chỉ hỗ trợ https và domain được phép). |
| 10 | Mở `/unlock/visit` trực tiếp trên thanh địa chỉ | Bị từ chối (400): chỉ lượt bấm trên trang đọc mới được cấp quyền. |

Luồng này chỉ chứng minh người đọc **đã bấm liên kết trên StoryWeb**, không chứng minh họ đã xem trang đích hay mua hàng.

## 4. Kiểm thử tự động

Chạy trên cùng database test, với app đang chạy ở cổng 3100 và `CLICK_UNLOCK_URL=https://example.com/`:

```bash
node --experimental-strip-types --no-warnings scripts/test-reader-preferences.mjs
STORYWEB_TEST_URL=http://127.0.0.1:3100 STORYWEB_TEST_ADMIN_PASSWORD=<ADMIN_PANEL_PASSWORD> CLICK_UNLOCK_SECRET=<như app> node scripts/test-unlock-link.mjs
```

`test-unlock-link.mjs` kiểm tra:
- chương 1 miễn phí; chương khóa không có body trong HTML hay RSC trước khi có grant;
- URL http, `javascript:`, có thông tin đăng nhập, IP, domain lạ và Shopee (khi chưa có chấp thuận) đều bị từ chối;
- rewarded vẫn "Chưa cấu hình" và mock trả 404;
- chỉ GET có Fetch Metadata của lượt bấm cùng origin mới được cấp grant (`303` tới `https://example.com/`, cookie HttpOnly, SameSite=Lax, Max-Age 300); request prefetch, cross-site, `?0` hoặc POST đều bị từ chối;
- chương hiện tại và chương kế tiếp đọc được, kể cả khi refresh qua RSC;
- một grant ký hợp lệ hạn 2 giây thật sự hết hạn (HTML và RSC không còn body); grant dài hơn 5 phút bị từ chối;
- tắt mở khóa thu hồi grant ngay.

Hồi quy: `scripts/test-auth.mjs`, `scripts/test-m2.mjs` (cần thêm một instance có mock và một instance DB lỗi, xem đầu file), `scripts/smoke.mjs`, `scripts/test-migration.mjs` (database trống).

## 5. Dọn dẹp

Tắt mở khóa trong `/panel/cai-dat`, xóa database test, xóa `.env.local` nếu chứa thông tin đăng nhập của server thật. Không đổi biến môi trường production (`CLICK_UNLOCK_ENABLED` vẫn là `false`).
