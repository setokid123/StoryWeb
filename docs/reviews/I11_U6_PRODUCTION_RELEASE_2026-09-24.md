# I11 — Phát hành U6 lên Railway production (2026-09-24)

## Mã và cổng kiểm tra

- `main` sạch trước khi phát hành; `origin/main` ở `288929c`, không có commit mới từ xa. Đã push commit ứng dụng `479a471` lên GitHub.
- Diff từ `288929c` đến `479a471` chỉ có CSS, tài liệu và ảnh QA. Không đổi schema, migration, API, quyền đọc hoặc cấu hình Railway.
- `npm run typecheck`, `npm run lint`, `npm run build` và `git diff --check origin/main..main` đều đạt trước khi push. Build Next.js 16.3.6 không còn route preview tạm.
- QA trình duyệt Sáng/Tối, mobile/tablet/desktop, trạng thái chương free/locked và các giới hạn đã ghi trong [I10](I10_U6_INTEGRATION_2026-09-24.md).

## Railway và production

- Railway project `StoryWeb`, environment `production`, service `StoryWeb`, Postgres online. Deployment ứng dụng `a04bd3ac-79fe-45d0-8036-a26c71bd1195` ứng với commit `479a471ac718b8ff01458289cc09b0f02e9b47c8`, trạng thái `SUCCESS`.
- Cấu hình deployment giữ pre-deploy `npm run db:migrate`, healthcheck `/api/health`. Log xác nhận `migrations applied successfully`; server `next start` báo Ready. U6 không thêm migration.
- Sau khi deployment thành công, GET `/api/health`, `/`, `/tim-kiem`, `/panel`, `/truyen/thanh-pho-sau-con-mua`, `/doc/thanh-pho-sau-con-mua/1` đều HTTP 200 tại <https://storyweb-production.up.railway.app>.
- HTML production tham chiếu một CSS bundle; bundle đang phục vụ chứa token `--bg-site` và selector `.reader-article` của U6.

## Giới hạn

- Smoke HTTP và CSS xác nhận bản mới đã phục vụ. Bằng chứng visual/browser là preview component local trong I10; chưa chụp lại toàn bộ trang production sau deploy.
- U6 không sửa logic khóa chương. Không chạy test ghi dữ liệu trên PostgreSQL production; kiểm thử DB và quyền đọc đã được ghi trong I5/I6.

Context7: không cần (không sửa API thư viện). Memory: đã tra U6/I11; đã cập nhật I11.
