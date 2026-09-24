# I6 — Phát hành Railway production (2026-09-24)

## Mã và kiểm tra trước deploy

- GitHub `main` trước release ở `839baee`; `main` local chứa 29 commit tích hợp U5/M3, review I3/I4 và test DB I5. Đã fetch origin, xác nhận không có commit remote mới, rồi push `49ad7d9` lên `main`.
- `npm run build`, `npm run typecheck`, `npm run lint` đạt. Unit reader preferences 8/8 và rewarded flow 9/9 đạt.
- I5 đã chạy migration, mở khóa link 8/8, auth 15/15 và smoke trên database riêng của PostgreSQL Railway, sau đó xóa database test. Xem [báo cáo I5](I5_RAILWAY_DB_TEST_2026-09-24.md).
- Truy vấn **chỉ đọc** database production `railway` trước deploy xác nhận đủ 4 migration `0000`–`0003`; diff từ `origin/main` không đổi file migration. Không chạy test ghi dữ liệu vào DB production.

## Deployment đầu tiên

- Push `49ad7d9` kích hoạt Railway deployment `1815498e-ecd7-48ba-ab7a-a0438e58098d` cho service `StoryWeb` / environment `production`; trạng thái `SUCCESS`.
- Log deployment xác nhận bước `npm run db:migrate` chạy và báo `migrations applied successfully`, sau đó Next.js 16.3.6 khởi động.
- Sau deploy: migration production vẫn 4/4; cấu hình mở khóa trong DB là `link`, `unlock_enabled=false`.
- GET production `/api/health`, `/`, `/tim-kiem`, `/panel` đều HTTP 200.
- DB production hiện không có chương khóa đã xuất bản, nên không thể đối chiếu trực tiếp body chương khóa trong HTML/RSC production. I5 đã kiểm tra trường hợp đó với database tách riêng trên Railway; không tạo nội dung test trong DB production.

## Bàn giao

- Code ứng dụng tại `49ad7d9` đã phát hành. Commit tài liệu I6 sau đó chỉ ghi kết quả release, không đổi logic hay migration.
- `Context7`: không cần (không sửa API thư viện).
- `Memory`: đã tra `I6`; đã cập nhật entity `I6`.
