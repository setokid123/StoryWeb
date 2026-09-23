# Giao việc hiện tại — U5 / M3

Codex đã lập [kế hoạch trang đọc](../READER_U5_M3_PLAN.md). Antigravity và Claude Code làm trên hai worktree riêng từ cùng một commit kế hoạch; người dùng mở đúng thư mục trong extension VS Code rồi gửi câu nhận việc dưới đây. Các file U4/M2 là lịch sử, không phải nhiệm vụ hiện tại.

| Agent | Thư mục mở trong VS Code | Nhánh | File giao việc |
| --- | --- | --- | --- |
| Antigravity | `E:\Dev\StoryWeb\.worktrees\antigravity-u5` | `antigravity/u5-reader-polish` | [ANTIGRAVITY_U5.md](ANTIGRAVITY_U5.md) |
| Claude Code | `E:\Dev\StoryWeb\.worktrees\claude-m3` | `claude/m3-reader-preferences-test-unlock` | [CLAUDE_M3.md](CLAUDE_M3.md) |

## Gửi Antigravity

> Mở worktree `E:\Dev\StoryWeb\.worktrees\antigravity-u5`. Đọc `AGENTS.md`, `docs/READER_U5_M3_PLAN.md`, `docs/assignments/ANTIGRAVITY_U5.md`, `docs/WORKBOARD.md`; nhận U5. Thiết kế và code view/CSS trang đọc: tên truyện và “Hết chương” lớn hơn, 4 nút đồng kiểu/căn giữa, panel tùy chỉnh đọc, responsive Sáng/Tối. Chỉ làm giao diện nhận props/callback; không sửa logic. Chạy typecheck/lint/build, commit và bàn giao props cùng ảnh/walkthrough.

## Gửi Claude Code

> Mở worktree `E:\Dev\StoryWeb\.worktrees\claude-m3`. Đọc `AGENTS.md`, `CLAUDE.md`, `docs/READER_U5_M3_PLAN.md`, `docs/assignments/CLAUDE_M3.md`, `docs/WORKBOARD.md`; nhận M3. Bạn phụ trách toàn bộ logic client/server: preference có lưu/validate/migrate, tích hợp view U5 sau bàn giao, và luồng test mở khóa 5 phút bằng `example.com` trên môi trường riêng. Giữ server guard/body khóa không lộ; không bật Shopee/rewarded mock production. Chạy typecheck/lint/build và test, commit rồi bàn giao.

## Thứ tự tích hợp

Hai agent có thể làm độc lập ngay. Antigravity chốt props view trước khi Claude ghép; Claude chuẩn bị model/test song song. Codex review hai commit, tích hợp và chạy thử ở môi trường tách production (I3). Không sửa trực tiếp worktree của nhau hoặc push `main`.
