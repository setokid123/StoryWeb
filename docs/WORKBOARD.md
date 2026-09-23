# Bảng việc chung

Codex điều phối tích hợp. Claude Code và Antigravity nhận việc qua `docs/assignments/` và làm trên worktree riêng. Mỗi agent cập nhật **Trạng thái**, **File sở hữu**, **Bàn giao** khi bắt đầu/kết thúc.

| ID | Chủ trì | Việc | Trạng thái | File sở hữu | Bàn giao/tiêu chí hoàn thành |
| --- | --- | --- | --- | --- | --- |
| S0 | Codex | Scaffold, khóa chương 5 phút, tích hợp và deploy | Hoàn tất | `src/app`, `src/components`, `src/data`, `src/lib`, `docs` | GitHub main và Railway production hoạt động; lint, typecheck, build, smoke production đạt |
| U1 | Agent UI nội bộ (trước đây) | Rà soát UI/UX panel đăng truyện mobile + desktop | Hoàn tất | `src/components/publishing-panel.tsx`, `src/components/admin-login.tsx`, `src/app/globals.css`, `docs/DESIGN_SYSTEM.md` | Thư viện truyện dùng được ở mobile, cảnh báo bản sửa chưa lưu, kiểm tra trước khi xuất bản, trạng thái loading/error/success; không đổi hợp đồng API. Typecheck và lint đạt; build tích hợp do Codex chạy. Chưa kiểm tra ảnh chụp trình duyệt. |
| B1 | Claude Code + Codex review | Xác thực nhiều tác giả và tài khoản độc giả | Đã tích hợp `main`, Railway production chạy migration `0002` | `src/db`, `src/lib`, `src/app/api/auth`, `src/app/api/admin`, `src/app/panel/page.tsx`, `drizzle/0002_b1_accounts_sessions.sql`; xem `docs/AUTH_API.md` | Claude: migration/test trên DB riêng đạt, 14 nhóm auth đạt. Codex: typecheck/lint/build đạt; sửa rate limit lấy IP **đầu** trong `X-Forwarded-For` theo xác nhận Railway, thêm test chuỗi nhiều hop (chưa chạy lại vì không có DB test local). Deployment `3c9f3dc0` SUCCESS; log migration thành công, schema/bản ghi `0002` kiểm tra trực tiếp trên DB, smoke GET production đạt. Xem `docs/B1_INTEGRATION_REVIEW_2026-09-23.md`. UI tài khoản mới còn thiếu; U3 được tích hợp sau B1. |
| B2 | Agent backend nội bộ (trước đây) | Chuyển panel JSON local sang PostgreSQL | Hoàn tất, kiểm thử Railway đạt | `src/db`, `src/lib/managed-stories.ts`, `src/app/api/admin/stories/route.ts`, `drizzle` | Migration, tạo/xuất bản/xóa truyện trên PostgreSQL đạt; typecheck/lint/build đạt |
| I1 | Codex | Tích hợp quyền đọc với DB | Hoàn tất, kiểm thử Railway đạt | Routes đọc/truyện, integration code | Chương 1 đọc được, chương khóa không lộ body trong HTML; smoke production đạt |
| M1 | Codex + Claude Code | Chọn nhà cung cấp quảng cáo có thưởng | Theo dõi trong M2; chưa có provider web xác minh được | provider/ad integration | Không dùng sự kiện thưởng chỉ ở client làm bằng chứng cấp quyền server; xem `docs/ADS_UNLOCK_PLAN.md` |
| M2 | Claude Code | Code toàn bộ logic: admin switch hai mode, quyền đọc 5 phút, registry quảng cáo và tích hợp view U4 | Đang làm (Claude Code) | `src/db`, `drizzle`, `src/lib`, `src/app/api`, routes/page, container client; không sửa CSS U4 | Worktree `.worktrees/claude-m2`, nhánh `claude/m2-ads-unlock-logic`; xem `docs/assignments/CLAUDE_M2.md`. Có migration/test/contract, fail-closed khi thiếu provider, typecheck/lint/build và commit. |
| U4 | Antigravity | Thiết kế/code giao diện nút chương, ad slots, dialog hai mode, switch admin | Đã giao qua file; chờ Antigravity nhận | Component view mới, `src/app/globals.css`, `src/app/dark-overrides.css`, `docs/DESIGN_SYSTEM.md` | Worktree `.worktrees/antigravity-u4`, nhánh `antigravity/u4-reader-ads-ui`; xem `docs/assignments/ANTIGRAVITY_U4.md`. Ảnh 360/768/1280 Sáng/Tối, keyboard, props contract, typecheck/lint/build và commit. |
| I2 | Codex | Review/tích hợp M2 + U4, kiểm tra bảo mật và deploy | Chờ bàn giao M2/U4 | Review, integration code, docs deploy | Chỉ bật rewarded khi có bằng chứng hoàn thành xác minh server; kiểm tra không lộ chương khóa, migration và smoke production. |
| U2 | Agent UI nội bộ (trước đây) | Hoàn thiện trạng thái panel/CMS hiện có | Hoàn tất phần panel hiện có | Cùng phạm vi U1 | Bản nháp cần tên/đường dẫn; xuất bản cần tác giả, mô tả và từng chương đầy đủ. Chưa có API lưu ảnh bìa nên chưa thêm upload; ghi trong design system. |
| U3 | Antigravity + Codex review | Hoàn thiện Studio/trang đọc, font tiếng Việt và theme Sáng/Tối toàn site | Đã tích hợp `main`, Railway production SUCCESS | `src/app/globals.css`, `src/app/layout.tsx`, `src/app/dark-overrides.css`, `src/components/theme-provider.tsx`, `src/components/site-header.tsx`, `src/components/reader-panel.tsx`, `src/components/admin-login.tsx`, `docs/DESIGN_SYSTEM.md` | Antigravity bàn giao commit `9660905`. Codex sửa tác dụng phụ DOM trong render, đồng bộ preference cũ, bỏ CSS lặp và whitespace; typecheck/lint/build trên mã tích hợp đạt. Deployment `02114504` SUCCESS, smoke production 4 route trả 200. Xem `docs/reviews/U3_INTEGRATION_REVIEW_2026-09-23.md`. |

## Giao thức bàn giao

1. Nhận việc: đổi `Chưa nhận` thành `Đang làm (tên agent)`, ghi file sẽ sửa.
2. Nếu cùng file với agent khác: dừng phần file đó, thỏa thuận thứ tự hoặc dùng nhánh/worktree riêng.
3. Kết thúc: ghi commit/PR (nếu có), file thay đổi, `typecheck/lint/build`, việc còn thiếu.
4. Codex tích hợp sau khi từng phần hoàn tất; không để hai agent cùng chạy migration trên một DB.

## Quyết định cần người dùng cung cấp trước khi làm production

- Nguồn truyện và quyền đăng tải.
- Chấp thuận riêng của Shopee và link affiliate trước khi bật cờ Shopee gate; nếu chưa có thì không bật mode link Shopee.
- Nhà cung cấp quảng cáo có thưởng cho web, quyền dùng SDK và bằng chứng hoàn thành mà server kiểm được. Chưa có thì mode rewarded giữ tắt.
- Dịch vụ thanh toán và mô hình điểm/gói đọc nếu triển khai.
- PostgreSQL dùng local, managed hay hạ tầng hiện có.
