# M2 — Claude Code: toàn bộ logic quảng cáo và quyền mở chương

## Vai trò mới

Từ M2, Claude Code phụ trách **toàn bộ logic của dự án**, gồm logic phía client, server, dữ liệu, state, validation, API, quyền truy cập và tích hợp dịch vụ. Antigravity thiết kế và code giao diện/view; Codex review, tích hợp và deploy. Vai trò mới không yêu cầu Claude tự viết CSS hoặc thay thế thiết kế của Antigravity.

Đọc `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/ADS_UNLOCK_PLAN.md`, `docs/WORKBOARD.md` và tài liệu Next.js liên quan trong `node_modules/next/dist/docs/`. Mở worktree `E:\Dev\StoryWeb\.worktrees\claude-m2` trên nhánh `claude/m2-ads-unlock-logic`. Kiểm tra branch/status rồi nhận dòng M2 trên workboard. Không dùng lại worktree B1.

## Kết quả cần code

1. Lưu setting site trong PostgreSQL bằng migration tương thích dữ liệu cũ: master `enabled=false`, phương thức `link | rewarded`, `revision` và trạng thái các display slot. Có lớp đọc/ghi cấu hình trên server, giới hạn quyền admin, validation và audit tối thiểu ai đổi/lúc nào. Env giữ vai trò chặn khẩn cấp và chứa secret; UI/API không được trả secret.
2. Thêm API và trang cài đặt admin (gợi ý `/panel/cai-dat`) dùng `getAdminAccess()`. Editor/reader/anonymous không đọc được setting riêng hoặc sửa mode. Claude sở hữu fetch, optimistic/pending state nếu dùng, xử lý lỗi và wiring vào view U4. Xử lý Origin/CSRF cho request đổi cấu hình.
3. Chuyển luồng đọc từ boolean `gateEnabled` sang mode đã resolve trên server. Quyền 5 phút vẫn kiểm ở server tại trang đọc và hàm lấy body; cookie hoặc entitlement phải gắn `revision` để đổi/tắt mode vô hiệu quyền cũ. Chương 1 và `freeChapterCount` hiện có giữ đúng; không lộ thân chương khóa trong HTML/RSC/API/cache.
4. Link mode: sử dụng cấu hình URL được kiểm tra, chặn open redirect/URL không hợp lệ. Giữ `SHOPEE_GATE_APPROVED` là chặn cứng server; admin không thể bật link Shopee khi thiếu chấp thuận. Rà route `/unlock/visit` để lượt cấp quyền chỉ gắn với thao tác được người đọc chủ động chọn; mô tả chính xác rằng hệ thống không xác minh người đọc đã xem trang đích/mua hàng. Không tự bật production link mode.
5. Rewarded mode: định nghĩa adapter và trạng thái `unconfigured | ready | unavailable | failed | granted`. Chỉ nhà cung cấp có bằng chứng hoàn thành **web** xác minh được trên server mới được cấp quyền; kiểm nonce/challenge, chữ ký hoặc token, chống phát lại và gắn phiên người đọc. Nếu chưa có provider/credential thì admin không lưu được mode đang bật, người đọc không có nút xem quảng cáo giả. Mock chỉ dùng dev/test. Không dùng riêng sự kiện trình duyệt `rewardedSlotGranted` của Google Ad Manager để phát cookie, vì [Google không có server-side verification cho rewarded web](https://support.google.com/admanager/answer/9116812?hl=en).
6. Display ads: tạo registry bốn placement trong `docs/ADS_UNLOCK_PLAN.md`, trạng thái bật/tắt riêng với unlock mode. Tạo logic load/no-fill/error và chỉ render view U4 khi slot thật sẵn sàng; không chèn script HTML tùy ý từ admin. Không coi click hoặc impression display ad là thưởng.
7. Logic cho điều hướng chương: href chương trước/sau, trạng thái biên và danh sách chương hiện có (chỉ tiêu đề/trạng thái được phép lộ). Truyền props cho view `ReaderNavigation` của U4; Claude sở hữu state mở/đóng drawer, cập nhật route và focus nếu cần. `reader-panel.tsx` và `publishing-panel.tsx` là container logic của Claude trong đợt này.

## File dự kiến sở hữu

`src/db/schema.ts`, migration mới trong `drizzle/`, `src/lib/click-unlock.ts` hoặc module unlock mới, `src/lib/managed-stories.ts` nếu cần, `src/app/unlock/visit/route.ts`, `src/app/doc/[slug]/[chapter]/page.tsx`, `src/app/panel/page.tsx`, route API admin mới, container client mới, `.env.example`, tài liệu contract/API và kiểm thử logic. Claude được sửa component container có logic (`reader-panel.tsx`, `publishing-panel.tsx`) sau khi U4 cung cấp view. **Không sửa** `src/app/globals.css`, `src/app/dark-overrides.css`, component view U4 hoặc `docs/DESIGN_SYSTEM.md` nếu chưa ghi phối hợp trên workboard.

Hai agent bắt đầu từ cùng commit; làm phần độc lập song song. Khi U4 commit, thông báo Codex và tích hợp view bằng merge/rebase có kiểm soát, không copy đè file. Ghi mọi thay đổi contract props cho Antigravity. Không push `main`, không deploy hoặc chạy migration trên Railway production.

## Nghiệm thu và bàn giao

- Test có ý nghĩa cho ma trận `off/link/rewarded`, admin/editor/reader, cookie hết 5 phút, đổi `revision`, thiếu provider, ad no-fill/hủy/lỗi, callback giả/phát lại và chương miễn phí. Xác nhận cả trang và hàm lấy body không lộ nội dung khóa.
- Migration chạy trên DB test có dữ liệu cũ, có rollback plan; không đổi các migration đã chạy ở production.
- `npm run typecheck`, `npm run lint`, `npm run build` đạt sau khi ghép view; ghi lệnh test và kết quả.
- Bàn giao commit, file đã đổi, schema/API/props contract, env cần thêm, provider cần người dùng cung cấp, các mode còn bị chặn và lý do. Chỉ ghi `rewarded` là hoàn tất production khi có provider web xác minh được và đã kiểm tra end-to-end.
