# Bảng việc chung

Ba công cụ chưa được khởi chạy tự động. Mở cùng repository trong Codex, Claude Code và Antigravity; giao task theo bảng dưới đây. Mỗi agent cập nhật **Trạng thái**, **File sở hữu**, **Bàn giao** khi bắt đầu/kết thúc.

| ID | Chủ trì | Việc | Trạng thái | File sở hữu | Bàn giao/tiêu chí hoàn thành |
| --- | --- | --- | --- | --- | --- |
| S0 | Codex | Scaffold, panel JSON local, khóa chương 5 phút, hướng dẫn chung | Hoàn tất bản đầu | `src/app`, `src/components`, `src/data`, `src/lib`, `docs` | Lint, typecheck, build và smoke đạt; chưa kiểm tra ảnh chụp trình duyệt; chưa có commit đầu tiên |
| U1 | UI agent (vai trò Antigravity) | Rà soát UI/UX panel đăng truyện mobile + desktop | Hoàn tất | `src/components/publishing-panel.tsx`, `src/components/admin-login.tsx`, `src/app/globals.css`, `docs/DESIGN_SYSTEM.md` | Thư viện truyện dùng được ở mobile, cảnh báo bản sửa chưa lưu, kiểm tra trước khi xuất bản, trạng thái loading/error/success; không đổi hợp đồng API. Typecheck và lint đạt; build tích hợp do Codex chạy. Chưa kiểm tra ảnh chụp trình duyệt. |
| B1 | Claude Code | Xác thực nhiều tác giả và tài khoản độc giả | Chưa nhận | `src/db`, `src/app/api`, auth modules | Session theo tài khoản, quyền editor/admin, rate limit |
| B2 | Backend agent (vai trò Claude Code) | Chuyển panel JSON local sang PostgreSQL | Hoàn tất mã, chờ kiểm thử DB Railway | `src/db`, `src/lib/managed-stories.ts`, `src/app/api/admin/stories/route.ts`, `drizzle` | CRUD transaction, migration, script import; typecheck/lint/build đạt |
| I1 | Codex | Tích hợp quyền đọc với DB | Hoàn tất mã, chờ kiểm thử DB Railway | Routes đọc/truyện, integration code | Chỉ truy vấn body sau khi server kiểm tra quyền; typecheck/lint/build đạt |
| M1 | Codex + Claude Code | Chọn và tích hợp quảng cáo có thưởng | Chờ chọn nhà cung cấp | entitlement/ad integration | Chỉ cấp quyền sau sự kiện hợp lệ, có fallback |
| U2 | UI agent (vai trò Antigravity) | Hoàn thiện trạng thái panel/CMS hiện có | Hoàn tất phần panel hiện có | Cùng phạm vi U1 | Bản nháp cần tên/đường dẫn; xuất bản cần tác giả, mô tả và từng chương đầy đủ. Chưa có API lưu ảnh bìa nên chưa thêm upload; ghi trong design system. |

## Giao thức bàn giao

1. Nhận việc: đổi `Chưa nhận` thành `Đang làm (tên agent)`, ghi file sẽ sửa.
2. Nếu cùng file với agent khác: dừng phần file đó, thỏa thuận thứ tự hoặc dùng nhánh/worktree riêng.
3. Kết thúc: ghi commit/PR (nếu có), file thay đổi, `typecheck/lint/build`, việc còn thiếu.
4. Codex tích hợp sau khi từng phần hoàn tất; không để hai agent cùng chạy migration trên một DB.

## Quyết định cần người dùng cung cấp trước khi làm production

- Nguồn truyện và quyền đăng tải.
- Chấp thuận riêng của Shopee và link affiliate trước khi bật cờ Shopee gate; nếu không có, chọn quảng cáo có thưởng.
- Dịch vụ thanh toán và mô hình điểm/gói đọc nếu triển khai.
- PostgreSQL dùng local, managed hay hạ tầng hiện có.
