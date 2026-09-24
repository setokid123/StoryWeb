# I14 — Phát hành M4 và bật cờ thử link (2026-09-24)

## Mã và triển khai

- M4/I13 đã ghép vào `main` và push GitHub ở commit `e49dab8ba03dfb1a9273dd5a655aae3221866753`. Railway deployment `b964ba0f-e291-4dac-880a-8ec9339ff4db` báo `SUCCESS`; pre-deploy `npm run db:migrate` thành công, Next.js 16.3.6 khởi động. M4 không thêm migration.
- Theo yêu cầu cho phép bật phương thức để test, đặt `CLICK_UNLOCK_ENABLED=true` cho service StoryWeb / environment production. Railway triển khai lại cùng commit ở deployment `812bad29-8a9a-4ed7-84fa-bc5370c5bebf`, `SUCCESS`; migration lặp lại thành công và Next.js sẵn sàng.
- Sau deployment thứ hai, GET `/api/health`, `/`, `/tim-kiem`, `/panel`, `/panel/cai-dat` đều HTTP 200. Đọc cấu hình Railway có chọn lọc: cờ link `true`, secret đủ 32 ký tự, `SHOPEE_GATE_APPROVED=false`. API admin sau đăng nhập xác nhận `unlockEnabled=false`, `effectiveMode=off`, chưa lưu URL, rewarded chưa cấu hình. Credential/cookie không được ghi vào tài liệu hoặc log bàn giao.

## Cách thử trong admin

Vào `/panel/cai-dat` → nhập URL HTTPS của tên miền công khai bất kỳ → **Lưu thay đổi** khi công tắc tổng tắt → bật công tắc **Bảo vệ chương khóa**, chọn **Nhấp liên kết** → **Lưu thay đổi**. Chỉ sau lần lưu cuối, độc giả mới thấy nút mở link ở chương khóa. `https://example.com/` là link mẫu. Link Shopee trực tiếp vẫn bị chặn tới khi có chấp thuận và cờ riêng; quảng cáo có thưởng chưa có provider xác minh phía server.

## Giới hạn và quay lại trạng thái an toàn

- Claude đã thử E2E API trên PostgreSQL Railway bằng database riêng, rồi xóa DB; Codex đã review và chạy lại unit/typecheck/lint/build (xem [I13](I13_M4_INTEGRATION_2026-09-24.md)). Smoke production chỉ đọc; chưa tự ghi link thử vào settings production hoặc thao tác form M4 bằng trình duyệt thật. Admin có thể thực hiện bước thử với URL mong muốn.
- Link ngoài có thể redirect tới trang khác; grant 5 phút xác nhận lượt bấm trên StoryWeb, không xác nhận truy cập đích hoặc giao dịch. Khi cần dừng ngay, tắt công tắc trong admin hoặc đặt `UNLOCK_EMERGENCY_OFF=true`; đặt `CLICK_UNLOCK_ENABLED=false` để chặn riêng phương thức link ở server. Cờ Shopee không thay đổi.

Context7: không cần (không đổi API thư viện trong bước phát hành). Memory: đã tra M4/I13; đã cập nhật I14.
