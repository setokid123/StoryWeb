# I5 — Kiểm tra trên PostgreSQL Railway (2026-09-24)

## Phạm vi và môi trường

- Project Railway `StoryWeb`, environment `production`, service `Postgres` và `StoryWeb` tồn tại. Bài test dùng kết nối public của service `Postgres` qua Railway CLI `run`.
- Mỗi lượt test tạo database riêng có tiền tố `storyweb_test_i5_` trên cùng PostgreSQL Railway. Ứng dụng Next.js chạy **local** và kết nối tới database test. Không chạy bài test ghi dữ liệu vào database production `railway`; không deploy code trong I5.
- Runner tạo mật khẩu admin và secret ngẫu nhiên cho từng lượt, bật link test `https://example.com/`, giữ `SHOPEE_GATE_APPROVED=false`, không bật rewarded provider. Các giá trị bí mật và URL kết nối không được ghi vào tài liệu/log bàn giao.

## Kết quả

| Kiểm tra | Kết quả |
| --- | --- |
| `scripts/test-migration.mjs` trên DB riêng | Đạt: áp dụng chuỗi `0000`–`0003`, giữ dữ liệu qua migration tài khoản `0002` và cấu hình mở khóa `0003`. |
| `drizzle-kit migrate` trên DB ứng dụng test | Đạt. |
| Ứng dụng local, `/api/health` | HTTP 200 khi kết nối DB test Railway. |
| `scripts/test-unlock-link.mjs` | 8/8 nhóm đạt: chương 1 miễn phí; body chương khóa vắng trong HTML/RSC; link đích không hợp lệ và Shopee bị chặn; rewarded chưa cấu hình bị chặn; click cùng origin cấp cookie HttpOnly 5 phút; chương 2/3 đọc được khi có quyền; cookie hết hạn/sửa đổi và thay revision đều bị từ chối. |
| `scripts/test-auth.mjs` | 15/15 nhóm đạt: session, quyền tác giả/admin, rate limit và chuỗi `X-Forwarded-For`. |
| `scripts/smoke.mjs` | Đạt: đăng nhập admin, xuất bản qua PostgreSQL, chương miễn phí/khóa, cookie 5 phút, chương tiếp theo và cookie bị sửa đổi. |
| Dọn dữ liệu test | Đã xóa database test sau **cả hai** lượt; truy vấn catalog cuối cùng cho tiền tố `storyweb_test_i5_%` trả về **0**. |
| Production `/api/health` | HTTP 200 (GET chỉ đọc). |

Lượt đầu smoke dừng ở assert URL chuyển hướng: test cũ cố định `https://example.com/storyweb-test`, còn cấu hình test Railway là `https://example.com/`. Ứng dụng trả đúng URL cấu hình. Đã thêm `STORYWEB_TEST_LINK_URL` vào smoke script, giữ mặc định cũ cho các môi trường hiện hành; lượt hai chạy smoke trên DB mới và đạt.

## Giới hạn

- Đây là test ứng dụng local với **PostgreSQL Railway thật** trên DB tách riêng; chưa kiểm thử bản code I3/I4 mới bằng deployment production. Production chỉ được kiểm tra health read-only.
- Chưa tích hợp nhà cung cấp rewarded web có callback server xác minh được. Link Shopee vẫn bị chặn theo cấu hình.

## Bàn giao

- Thay đổi: `scripts/smoke.mjs` nhận kỳ vọng link test qua biến môi trường, `docs/WORKBOARD.md` và tài liệu này.
- `Context7`: node-postgres 8.x, tài liệu `Client` với `connectionString`, `connect`, `query`, `end` dùng cho runner tạm (đã xóa sau test).
- `Memory`: đã tra `I5`/`Railway Postgres test`; đã cập nhật entity `I5`.
- `npm run build`, `npm run typecheck`, `npm run lint`: đạt.
