# Review tích hợp B1 — 23/09/2026

B1 được fast-forward từ `claude/b1-multi-user-auth` vào `main` tại `5260e88`. Claude đã chạy migration 0002 và 14 nhóm test API trên hai database **riêng** `storyweb_b1_test` / `storyweb_b1_migration_test`; log bàn giao nằm ở `docs/WORKBOARD.md`. Codex kiểm tra lại `typecheck`, `lint`, `build`, `git diff --check` trước deploy.

## Phát hiện và sửa khi tích hợp

- `src/lib/request-guard.ts` ban đầu lấy IP **cuối** trong `X-Forwarded-For`. [Nhân viên Railway xác nhận](https://station.railway.com/questions/security-critical-questions-on-edge-prox-8fddd775) edge kiểm soát header và IP đầu là IP kết nối; [hướng dẫn khác của họ](https://station.railway.com/questions/which-header-should-i-rely-on-for-real-c-d78a6f96) cũng khuyên lấy IP đầu khi có CDN. Codex đổi sang phần tử đầu và thêm trường hợp nhiều proxy hop vào `scripts/test-auth.mjs`. Trường hợp mới cần chạy lại trên test DB khi có môi trường; không chạy test ghi dữ liệu trên production.
- Lint trên `main` từng quét cả `.worktrees` và các file `.next` của agent. `eslint.config.mjs` nay bỏ qua `.worktrees/**`; lint của mã chính đạt.
- Migration `0002` chỉ thêm `auth_rate_limits`, `user_sessions`, `stories.owner_id`, `users.password_hash`, `users.updated_at` và index/foreign key. Truyện/tài khoản cũ giữ nguyên; owner cũ là `NULL`, chỉ admin quản lý.
- `railway config plan` trên project `StoryWeb`, environment `production` báo cấu hình đã khớp file `.railway/railway.ts`. File này đặt `preDeploy: "npm run db:migrate"`. Theo [Railway](https://docs.railway.com/deployments/pre-deploy-command), bước này chạy trước khi phiên bản mới phục vụ và deploy dừng nếu migration lỗi.

## Phạm vi bàn giao

Backend tài khoản và CMS có quyền đã tích hợp. UI đăng nhập/đăng ký tài khoản mới chưa có; `/panel` vẫn hỗ trợ mật khẩu admin cũ. Luồng mở khóa chương giữ nguyên và mặc định tắt. U3 của Antigravity ở worktree riêng, chưa tích hợp do các lỗi review còn lại.
