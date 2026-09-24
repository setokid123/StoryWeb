# Bàn giao đã hoàn thành — U5 / M3

Antigravity và Claude Code đã bàn giao U5/M3 trên hai worktree dưới đây; Codex tích hợp và ghi kết quả tại [review I3](../reviews/I3_READER_MCP_REVIEW_2026-09-24.md). Các câu nhắc bên dưới được giữ làm lịch sử. Việc tiếp theo cần nhánh/worktree mới từ `main` hiện hành, có `.mcp.json`, và kiểm tra Context7/Memory theo [quy ước MCP](../MCP_TOOLS.md).

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
