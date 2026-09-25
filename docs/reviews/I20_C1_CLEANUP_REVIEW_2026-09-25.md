# I20 — Review C1 cleanup (2026-09-25)

## Kết quả

- Review nhánh Claude `claude/cleanup` tại `4362a7e`: bỏ export không dùng, CSS cũ, script import JSON một lần; thêm `npm run test:unit`; chuyển assignment và kế hoạch hoàn tất sang `docs/archive/`. Không đổi schema, migration, dependency hay `package-lock.json`.
- Các route mở khóa chỉ bỏ thao tác xóa cookie `storyweb_click_unlock` cũ. `getUnlockExpiration` chỉ đọc `storyweb_unlock` có HMAC, mode/revision và hạn 300 giây; cookie cũ vẫn không cấp quyền. `ReaderPanel` bỏ class `reader-shell--night` và CSS Tối dùng `[data-theme="dark"]`, đồng bộ với `ThemeProvider`. Các selector CSS bị xóa không còn xuất hiện trong `src`.
- Kiểm tra độc lập trên C1: `typecheck`, `lint`, `build`, `git diff --check`, `test:unit` 36/36 đạt. Sau khi thêm biên bản I20, kiểm tra 51 file Markdown, 93 link nội bộ, không có link hỏng. Claude báo đã so computed style 4.220 phần tử và chạy DB E2E trên database riêng đã xóa; Codex không lặp lại hai kiểm tra này.

## Sửa khi tích hợp

1. Giữ `content/published-stories.json` trong `.gitignore`. Máy khác có thể còn file JSON cũ chứa bản nháp; xóa script import không phải lý do để file đó xuất hiện trong `git status` và có thể bị commit nhầm.
2. Giới hạn tên database cho `scripts/test-unlock-link.mjs` về dạng test (`storyweb_test*` hoặc `storyweb_<task>_*test*`). Regex Claude mở rộng cho mọi `storyweb_c<number>_*`, gồm cả tên như `storyweb_c1_prod`; script này ghi dữ liệu nên cần từ chối tên đó. Đã thử chấp nhận `storyweb_c1_test`, `storyweb_c1_migration_test`, `storyweb_m4_test`; từ chối `storyweb_c1_prod` và `railway`.

Sau hai sửa nhỏ, nhánh tích hợp `codex/i20-c1-review` đạt `typecheck`, `lint`, `build`, `test:unit` 36/36 và `git diff --check`. Đây là dọn mã, không có tính năng mới.

## Phát hành production

- Đã push app commit `830a392` lên `origin/main`. Railway báo `SUCCESS` cho deployment `5be95a90-7025-4d30-b8ea-6f5f2f095dd3`.
- Smoke test production: `/api/health`, `/`, `/tim-kiem`, `/panel` trả 200; người chưa đăng nhập vào `/panel/cai-dat` được chuyển 307 về `/panel`.
- Không có thay đổi schema/migration hay dependency trong đợt này. Trạng thái Railway được xác nhận qua GitHub commit status; không kiểm trực tiếp log pre-deploy.

Context7: không cần (không sửa API thư viện). Memory: đã tra C1/gotcha:worktree-node-modules; đã cập nhật I20.
