# Review tích hợp M2/U4 — 24/09/2026

Nguồn: Claude Code `d4ac1e8` (đã merge view U4 `dadb41e`). Codex ghép M2 vào nhánh review I2, sửa các lỗi tìm thấy rồi mới đưa lên production.

## Quyền đọc và rò rỉ body

- Trang `/doc/[slug]/[chapter]` dùng metadata chương không chứa body. Body từ PostgreSQL chỉ được truy vấn sau khi kiểm quyền và `getManagedChapterBody()` kiểm quyền lần nữa. Chương khóa không được gửi trong HTML hoặc RSC khi chưa có grant. Trang dùng `force-dynamic`.
- Cookie mở khóa có HMAC, HttpOnly, Secure trên production, thời hạn 300 giây, gắn mode và revision. Đổi cấu hình hoặc tắt mode làm grant cũ mất hiệu lực. Cookie cũ không được chấp nhận.
- I2 kiểm lại thời hạn sau khi tải body/cấu hình quảng cáo trước khi tạo props. Client gỡ nội dung khỏi DOM khi hết hạn, kể cả khi `router.refresh()` bị chậm/offline, và kiểm lại lúc focus/hiện tab. Link chương tắt prefetch để tránh tải body trong nền.
- I2 bỏ POST `/unlock/visit` vì POST không có `Origin` hay Fetch Metadata trước đây vẫn nhận grant. GET chỉ nhận điều hướng cùng origin có dấu hiệu người dùng bấm; URL đích chỉ cho `example.com` khi test hoặc domain Shopee Việt Nam khi có cờ chấp thuận.
- Rewarded chỉ cấp grant sau callback có chữ ký, nonce đúng người đọc/revision, claim một lần. Provider mock tự từ chối trên Railway. API CMS có body đặt `Cache-Control: no-store`.

Fetch Metadata có thể bị HTTP client giả. Một body đã được gửi cho người đọc hợp lệ có thể bị họ lưu hoặc sao chép; hết hạn chỉ thu hồi quyền ở các request mới và ẩn nội dung trên giao diện đang mở. Cookie grant là bearer token có thể bị chuyển cho trình duyệt khác trong 5 phút nếu bị sao chép.

## Migration và backup

- `0003_m2_site_settings_unlock.sql` chỉ thêm enum, ba bảng, index/FK và dòng `site_settings` mặc định `unlock_enabled=false`. Snapshot `0003` nối đúng `0002`; không sửa bảng cũ.
- Trước deploy, SELECT trực tiếp Postgres production cho thấy ledger có ba bản ghi đến `0002` (`created_at=1790175948074`), `site_settings` chưa tồn tại. Railway vẫn cấu hình `preDeploy: npm run db:migrate` trong `.railway/railway.ts`.
- Railway đã ghi nhận backup `pre-m2-2026-09-24` (ID `679e3416-9245-4fff-a34f-e7447cb83cff`) trước migration. PITR liên tục chưa bật; backup thủ công này là điểm khôi phục.
- Trên hai DB thử nghiệm riêng `storyweb_i2_*`, bài nâng cấp `0000+0001` có dữ liệu → `0002+0003` giữ đủ dòng; `drizzle-kit migrate` trên DB trống áp dụng toàn bộ migration thành công. Cả hai DB thử nghiệm đã được xóa.

## Kiểm thử trước deploy

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run typecheck`, `npm run lint`, `npm run build` trên worktree tích hợp | Đạt |
| B1 auth hồi quy trên DB thử nghiệm | 15/15 nhóm đạt |
| Rewarded flow unit | 9/9 đạt |
| M2 integration trên ba app instance (mock, thiếu provider, DB lỗi) | 14/14 nhóm đạt: HTML/RSC, cookie, POST 405, mode/revision, callback/claim, audit, ads |
| `git diff main --check` | Không có lỗi khoảng trắng |

Production đang có `CLICK_UNLOCK_ENABLED=false`, `SHOPEE_GATE_APPROVED=false`; chưa cấu hình provider rewarded/display. Admin không thể bật rewarded khi không có provider xác minh phía server. Link Shopee chỉ được bật sau chấp thuận riêng.

Rollback ứng dụng: quay lại code trước M2; migration chỉ thêm schema nên giữ nguyên bảng mới và ledger. Không xóa bảng hoặc sửa ledger cho rollback thông thường.

## Production

- `main` commit `2dce45a`; Railway deployment `ee06371a-9157-4bde-9763-f33b41ec52e3` báo `SUCCESS`. Log pre-deploy ghi `migrations applied successfully`; health `/api/health` trả `200 {"status":"ok"}`.
- SELECT sau deploy: ledger có bản ghi thứ tư `created_at=1790182784468` khớp journal `0003`; `site_settings`, `stories`, `users` tồn tại. Dòng mặc định có `unlock_enabled=false`, `unlock_mode=link`, revision 1 và bốn slot tắt.
- Smoke HTTPS production qua API: đăng nhập admin, tạo/xuất bản truyện thử, chương 1 đọc được, body chương 2 không có trong HTML/RSC khi khóa, `/unlock/visit` GET không có Fetch Metadata bị từ chối, POST trả 405, cờ mở khóa vẫn tắt. Truyện thử được xóa; counts `stories/users/chapters` sau smoke đều bằng 0.
- Chế độ link và rewarded chưa được bật vì chưa có chấp thuận Shopee hoặc provider rewarded web có chứng cứ server xác minh. Kiểm tra production không thấy provider rewarded/display được cấu hình.
