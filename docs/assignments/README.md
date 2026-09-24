# Bàn giao M4 — đã hoàn tất

| Agent | Worktree | Nhánh | File giao việc |
| --- | --- | --- | --- |
| Claude Code | `E:\Dev\StoryWeb\.worktrees\claude-m4` | `claude/m4-any-link-test` | [CLAUDE_M4.md](CLAUDE_M4.md) |

Claude Code đã bàn giao M4; Codex đã [review/tích hợp](../reviews/I13_M4_INTEGRATION_2026-09-24.md) và [phát hành production](../reviews/I14_M4_PRODUCTION_RELEASE_2026-09-24.md). URL HTTPS công khai tùy chọn và phương thức Nhấp liên kết có thể bật để test khi admin lưu cấu hình. Shopee vẫn có cờ chấp thuận riêng; rewarded vẫn cần provider xác minh phía server.

Worktree M4 là lịch sử bàn giao; không dùng lại cho task mới. [CLAUDE_M4.md](CLAUDE_M4.md) giữ phạm vi và tiêu chí nghiệm thu của M4.

## Lịch sử — U6

| Agent | Worktree | Nhánh | File giao việc |
| --- | --- | --- | --- |
| Antigravity | `E:\Dev\StoryWeb\.worktrees\antigravity-u6` | `antigravity/u6-visual-hierarchy` | [ANTIGRAVITY_U6.md](ANTIGRAVITY_U6.md) |

Đưa cho Antigravity [câu nhắc U6](ANTIGRAVITY_U6.md#câu-nhắc-đưa-vào-antigravity). Đọc [kế hoạch phân tầng giao diện](../VISUAL_HIERARCHY_U6_PLAN.md). Claude **chưa có task U6** vì vòng này chỉ cần giao diện; nếu Antigravity cần đổi container React đang giữ logic, Codex sẽ mở task tích hợp riêng sau khi có view contract.

U6 đã qua [review tích hợp I10](../reviews/I10_U6_INTEGRATION_2026-09-24.md) và được [deploy production trong I11](../reviews/I11_U6_PRODUCTION_RELEASE_2026-09-24.md).

Codex đã review commit U6 đầu tiên và phát hiện lỗi dark mode chặn tích hợp. Antigravity cần đọc [phản hồi I8](../reviews/U6_VISUAL_REVIEW_2026-09-24.md), sửa trên chính nhánh U6 và bàn giao lại kèm ảnh/đo tương phản.

## Lịch sử — U5 / M3

Antigravity và Claude Code đã bàn giao U5/M3 trên hai worktree dưới đây; Codex tích hợp và ghi kết quả tại [review I3](../reviews/I3_READER_MCP_REVIEW_2026-09-24.md). Các câu nhắc bên dưới được giữ làm lịch sử. U6 dùng worktree mới từ `main` ở bảng trên và kiểm tra Context7/Memory theo [quy ước MCP](../MCP_TOOLS.md).

| Agent | Thư mục mở trong VS Code | Nhánh | File giao việc |
| --- | --- | --- | --- |
| Antigravity | `E:\Dev\StoryWeb\.worktrees\antigravity-u5` | `antigravity/u5-reader-polish` | [ANTIGRAVITY_U5.md](ANTIGRAVITY_U5.md) |
| Claude Code | `E:\Dev\StoryWeb\.worktrees\claude-m3` | `claude/m3-reader-preferences-test-unlock` | [CLAUDE_M3.md](CLAUDE_M3.md) |

## Gửi Antigravity

> Mở worktree `E:\Dev\StoryWeb\.worktrees\antigravity-u5`. Đọc `AGENTS.md`, `docs/READER_U5_M3_PLAN.md`, `docs/assignments/ANTIGRAVITY_U5.md`, `docs/WORKBOARD.md`; nhận U5. Thiết kế và code view/CSS trang đọc: tên truyện và “Hết chương” lớn hơn, 4 nút đồng kiểu/căn giữa, panel tùy chỉnh đọc, responsive Sáng/Tối. Chỉ làm giao diện nhận props/callback; không sửa logic. Chạy typecheck/lint/build, commit và bàn giao props cùng ảnh/walkthrough.

## Gửi Claude Code

> Mở worktree `E:\Dev\StoryWeb\.worktrees\claude-m3`. Đọc `AGENTS.md`, `CLAUDE.md`, `docs/READER_U5_M3_PLAN.md`, `docs/assignments/CLAUDE_M3.md`, `docs/WORKBOARD.md`; nhận M3. Bạn phụ trách toàn bộ logic client/server: preference có lưu/validate/migrate, tích hợp view U5 sau bàn giao, và luồng test mở khóa 5 phút bằng `example.com` trên môi trường riêng. Giữ server guard/body khóa không lộ; không bật Shopee/rewarded mock production. Chạy typecheck/lint/build và test, commit rồi bàn giao.

## Thứ tự tích hợp

Antigravity chốt props view trước khi Claude ghép; Claude hoàn thiện model/test song song. I3 đã review mã tích hợp; xem báo cáo để biết các kiểm tra còn thiếu trên trình duyệt và môi trường test riêng. Không dùng lại hai worktree này cho vòng mới.
