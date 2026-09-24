# Bàn giao hiện tại — U7 / M5

| Agent | Worktree | Nhánh | File giao việc |
| --- | --- | --- | --- |
| Antigravity | `E:\Dev\StoryWeb\.worktrees\antigravity-u7` | `antigravity/u7-reader-glass-nav` | [ANTIGRAVITY_U7.md](ANTIGRAVITY_U7.md) |
| Claude Code | `E:\Dev\StoryWeb\.worktrees\claude-m5` | `claude/m5-reader-scroll-nav` | [CLAUDE_M5.md](CLAUDE_M5.md) |

Đọc [kế hoạch U7/M5](../READER_FLOATING_NAV_U7_M5_PLAN.md). Antigravity làm view/CSS dock kính mờ bốn nút và toolbar reader; Claude làm logic scroll/focus trong ReaderPanel rồi ghép view khi U7 bàn giao. Hai agent nhận task trên [workboard](../WORKBOARD.md), làm nhánh riêng và không sửa file của nhau. Codex review/tích hợp sau khi cả hai bàn giao; chưa deploy U7/M5.

## Lịch sử — M4 đã hoàn tất

| Agent | Worktree | Nhánh | File giao việc |
| --- | --- | --- | --- |
| Claude Code | `E:\Dev\StoryWeb\.worktrees\claude-m4` | `claude/m4-any-link-test` | [CLAUDE_M4.md](CLAUDE_M4.md) |

Claude Code đã bàn giao M4; Codex đã [review/tích hợp](../reviews/I13_M4_INTEGRATION_2026-09-24.md) và [phát hành production](../reviews/I14_M4_PRODUCTION_RELEASE_2026-09-24.md). URL HTTPS công khai tùy chọn và phương thức Nhấp liên kết có thể bật để test khi admin lưu cấu hình. Shopee vẫn có cờ chấp thuận riêng; rewarded vẫn cần provider xác minh phía server.

Worktree M4 là lịch sử bàn giao; không dùng lại cho task mới. [CLAUDE_M4.md](CLAUDE_M4.md) giữ phạm vi và tiêu chí nghiệm thu của M4.

## Lịch sử — U6

| Agent | Worktree | Nhánh | File giao việc |
| --- | --- | --- | --- |
| Antigravity | `E:\Dev\StoryWeb\.worktrees\antigravity-u6` | `antigravity/u6-visual-hierarchy` | [ANTIGRAVITY_U6.md](ANTIGRAVITY_U6.md) |

U6 đã qua [review tích hợp I10](../reviews/I10_U6_INTEGRATION_2026-09-24.md) và được [deploy production trong I11](../reviews/I11_U6_PRODUCTION_RELEASE_2026-09-24.md). [Kế hoạch U6](../VISUAL_HIERARCHY_U6_PLAN.md) và [phản hồi các vòng review](../reviews/U6_VISUAL_REVIEW_2026-09-24.md) được giữ để tra cứu, không còn là yêu cầu đang chờ Antigravity.

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
