# M4 — Claude Code: link mở khóa tùy chọn và bật chế độ thử nghiệm

Mở `E:\Dev\StoryWeb\.worktrees\claude-m4` trên nhánh `claude/m4-any-link-test`. Đọc `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKBOARD.md`, `docs/UNLOCK_API.md`, `docs/UNLOCK_TEST_GUIDE.md` và review I12. Nhận M4 trên workboard trước khi sửa. Tra Memory theo `M4` và `unlock-grant`; dùng tài liệu Next.js trong `node_modules/next/dist/docs/` và Context7 khi sửa API thư viện.

## Yêu cầu sản phẩm

1. Quản trị viên nhập và lưu được **URL HTTPS của bất kỳ tên miền công khai nào**, không giới hạn `example.com`/Shopee. Tách thao tác **lưu URL khi công tắc tắt** khỏi thao tác **bật phương thức Nhấp liên kết**. Sau khi server có `CLICK_UNLOCK_ENABLED=true`, `CLICK_UNLOCK_SECRET` hợp lệ và URL hợp lệ, công tắc trong `/panel/cai-dat` phải bật/lưu được, trạng thái hiệu lực hiện `link`. Thông báo lỗi phải chỉ đúng điều kiện chưa đạt, không làm mất bản nháp.
2. Xóa allowlist tên miền hiện tại trong `checkUnlockLinkUrl`, nhưng giữ validation phía server cho cả PUT admin, readiness và `/unlock/visit`: chỉ `https:`, tối đa 2048 ký tự, không user/password, không IP literal/localhost/tên miền nội bộ hoặc URL sai cú pháp. Dùng cùng một hàm chuẩn hóa URL để tránh UI và server bất đồng. Không truy cập URL từ server để kiểm tra đích. Tìm và cập nhật mọi thông báo “chỉ hỗ trợ Shopee”.
3. **Shopee vẫn là trường hợp riêng:** URL trỏ trực tiếp đến `shopee.vn`, `shp.ee`, `shope.ee` chỉ được dùng khi `SHOPEE_GATE_APPROVED=true`; không bật cờ này để test. Với link khác, không cần cờ Shopee. Link rút gọn/redirect có thể dẫn tới đích khác; ghi rõ giới hạn đó, không tuyên bố đã xác minh đích cuối hoặc lượt mua.
4. Giữ luồng do người đọc chủ động bấm, mở tab mới; không tự bật popup hoặc tự chuyển hướng. Không sửa TTL 300 giây, cookie HMAC, `unlock_revision`, Fetch Metadata, `UNLOCK_EMERGENCY_OFF`, `no-store` hoặc guard quyền đọc ở server. Chương khóa không được gửi body vào HTML/RSC trước grant, kể cả khi công tắc tắt hoặc grant hết hạn.
5. “Bật phương thức để test” ở M4 là **Nhấp liên kết** bằng URL HTTPS tùy chọn. Phương thức **Xem quảng cáo có thưởng** vẫn không được bật khi chưa có provider và bằng chứng hoàn tất do server xác minh; không thêm mock production hay bypass quyền đọc. Cờ link mặc định vẫn tắt trong code/env mẫu. Codex sẽ quyết định cấu hình và triển khai production sau khi review.

## File và ranh giới

- Claude sở hữu logic ở `src/lib/unlock.ts`, `src/lib/admin-settings.ts`, `src/components/unlock-settings-container.tsx` (nếu cần), test scripts và tài liệu `docs/UNLOCK_API.md`, `docs/UNLOCK_TEST_GUIDE.md`, `.env.example` nếu mô tả env cần sửa.
- Nếu cần đổi lời hướng dẫn hoặc trạng thái trình bày trong `unlock-settings-view.tsx`, ghi contract/copy đề xuất trên workboard để Codex giao Antigravity; không sửa CSS hoặc view đang thuộc giao diện nếu chưa ghi nhận quyền sở hữu.
- Không sửa schema/migration/package nếu không thực sự cần. Nếu phải sửa, ghi lý do và chủ sở hữu trên workboard trước; test migration DB riêng, không dùng DB production.

## Kiểm thử nghiệm thu

- URL HTTPS công khai khác Shopee (ví dụ `https://www.wikipedia.org/`) lưu được khi công tắc tắt và bật được khi server flag/secret sẵn sàng. `https://example.com/` vẫn hoạt động. Direct Shopee bị chặn khi chưa có cờ chấp thuận; cờ chấp thuận không được tự bật.
- Từ chối `http:`, `javascript:`, `data:`, `file:`, URL có credentials, localhost/loopback/IP literal/tên miền nội bộ, URL sai cú pháp hoặc quá dài. Không phân biệt sai hoa/thường ở hostname, không nhầm `shopee.vn.evil.example` thành Shopee.
- Test trên **PostgreSQL Railway bằng database thử riêng** theo `docs/UNLOCK_TEST_GUIDE.md`: lưu/tải lại URL, bật link mode, GET `/unlock/visit` hợp lệ/không hợp lệ, redirect và cookie 300 giây, đọc chương 2 trước/sau grant, qua chương mới trong hạn, hết hạn, đổi URL/mode/revision, HTML/RSC không lộ body khi chưa có quyền. Giữ production DB và cờ production nguyên trạng.
- Chạy `npm run typecheck`, `npm run lint`, `npm run build`, test M2/link/rewarded liên quan; ghi kết quả và test nào không chạy được. `git diff --check` và commit trên nhánh M4.

## Bàn giao

Ghi commit, file đã sửa, contract/API/env, kết quả test, rủi ro redirect ngoài site và việc còn thiếu trên `docs/WORKBOARD.md`. Ghi `Context7: ...` hoặc lý do không cần, `Memory: đã tra M4/unlock-grant; đã cập nhật M4`. Không push `main` hoặc deploy. Codex review bảo mật và tích hợp sau bàn giao.

### Câu nhắc đưa vào Claude Code

> Mở worktree `E:\Dev\StoryWeb\.worktrees\claude-m4`. Đọc `docs/assignments/CLAUDE_M4.md` và nhận M4 trong `docs/WORKBOARD.md`. Code toàn bộ logic để admin lưu URL HTTPS công khai bất kỳ và bật phương thức Nhấp liên kết để test khi server flag/secret hợp lệ. Giữ Shopee gate, quyền đọc server, cookie 5 phút và rewarded fail-closed. Chạy test với DB riêng, typecheck/lint/build, commit nhánh M4 và bàn giao theo workboard. Không deploy.
