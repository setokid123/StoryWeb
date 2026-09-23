# Bảng việc chung

Codex điều phối tích hợp. Claude Code và Antigravity nhận việc qua `docs/assignments/` và làm trên worktree riêng. Mỗi agent cập nhật **Trạng thái**, **File sở hữu**, **Bàn giao** khi bắt đầu/kết thúc.

| ID | Chủ trì | Việc | Trạng thái | File sở hữu | Bàn giao/tiêu chí hoàn thành |
| --- | --- | --- | --- | --- | --- |
| S0 | Codex | Scaffold, khóa chương 5 phút, tích hợp và deploy | Hoàn tất | `src/app`, `src/components`, `src/data`, `src/lib`, `docs` | GitHub main và Railway production hoạt động; lint, typecheck, build, smoke production đạt |
| U1 | Agent UI nội bộ (trước đây) | Rà soát UI/UX panel đăng truyện mobile + desktop | Hoàn tất | `src/components/publishing-panel.tsx`, `src/components/admin-login.tsx`, `src/app/globals.css`, `docs/DESIGN_SYSTEM.md` | Thư viện truyện dùng được ở mobile, cảnh báo bản sửa chưa lưu, kiểm tra trước khi xuất bản, trạng thái loading/error/success; không đổi hợp đồng API. Typecheck và lint đạt; build tích hợp do Codex chạy. Chưa kiểm tra ảnh chụp trình duyệt. |
| B1 | Claude Code của người dùng | Xác thực nhiều tác giả và tài khoản độc giả | Đã giao qua file; chờ Claude Code nhận | Worktree `.worktrees/claude-b1`, nhánh `claude/b1-multi-user-auth`; `src/db`, `src/app/api`, auth modules; xem `docs/assignments/CLAUDE_B1.md` | Session theo tài khoản, quyền editor/admin, rate limit; Codex review trước tích hợp |
| B2 | Agent backend nội bộ (trước đây) | Chuyển panel JSON local sang PostgreSQL | Hoàn tất, kiểm thử Railway đạt | `src/db`, `src/lib/managed-stories.ts`, `src/app/api/admin/stories/route.ts`, `drizzle` | Migration, tạo/xuất bản/xóa truyện trên PostgreSQL đạt; typecheck/lint/build đạt |
| I1 | Codex | Tích hợp quyền đọc với DB | Hoàn tất, kiểm thử Railway đạt | Routes đọc/truyện, integration code | Chương 1 đọc được, chương khóa không lộ body trong HTML; smoke production đạt |
| M1 | Codex + Claude Code | Chọn và tích hợp quảng cáo có thưởng | Chờ chọn nhà cung cấp | entitlement/ad integration | Chỉ cấp quyền sau sự kiện hợp lệ, có fallback |
| U2 | Agent UI nội bộ (trước đây) | Hoàn thiện trạng thái panel/CMS hiện có | Hoàn tất phần panel hiện có | Cùng phạm vi U1 | Bản nháp cần tên/đường dẫn; xuất bản cần tác giả, mô tả và từng chương đầy đủ. Chưa có API lưu ảnh bìa nên chưa thêm upload; ghi trong design system. |
| U3 | Antigravity của người dùng | Hoàn thiện Studio/trang đọc, font tiếng Việt và theme Sáng/Tối toàn site | Cần sửa sau review Codex 23/09 | `src/app/globals.css`, `src/app/layout.tsx`, `src/app/dark-overrides.css`, `src/components/theme-provider.tsx`, `src/components/site-header.tsx`, `src/components/reader-panel.tsx`, `src/components/admin-login.tsx`, `docs/DESIGN_SYSTEM.md` | Typecheck/build đạt; font Việt và focus dialog đạt trong Chrome. Lint còn 3 lỗi; theme hệ thống đổi khi trang đang mở làm nút/trình đọc lệch trạng thái; chữ trong dialog tối thiếu tương phản; diff còn trailing whitespace. Xem `docs/reviews/U3_THEME_FONT_REVIEW_2026-09-23.md`, sửa rồi commit nhánh U3 để Codex tích hợp. |
| U3 | Antigravity của người dùng | Hoàn thiện Studio/trang đọc, font tiếng Việt và theme Sáng/Tối toàn site | Hoàn tất (sẵn sàng tích hợp) | `src/app/globals.css`, `src/app/layout.tsx`, `src/app/dark-overrides.css`, `src/components/theme-provider.tsx`, `src/components/site-header.tsx`, `src/components/reader-panel.tsx`, `src/components/admin-login.tsx`, `docs/DESIGN_SYSTEM.md` | Đã dùng useSyncExternalStore giải quyết toàn bộ 3 lỗi lint, đồng bộ theme hệ thống tự động mà không lệch trạng thái; tăng tương phản dialog tối >4.5:1; xóa khoảng trắng dư. Đã chạy typecheck/lint/build và tạo commit. Mã commit: bc0eebd. |

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
