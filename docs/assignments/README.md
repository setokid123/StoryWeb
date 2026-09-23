# Giao việc cho Claude Code và Antigravity

Hai việc đã tách file và worktree. Bạn mở đúng thư mục bên dưới trong từng app, rồi gửi câu nhắc tương ứng. Hai agent tự đọc file chi tiết, nhận việc trên `docs/WORKBOARD.md` trong nhánh của mình, sửa mã, kiểm tra và commit. Codex sẽ review trước khi đưa lên `main`.

| Agent | Mở thư mục này | Nhánh đã tạo | File giao việc |
| --- | --- | --- | --- |
| Claude Code | `E:\Dev\StoryWeb\.worktrees\claude-b1` | `claude/b1-multi-user-auth` | `docs/assignments/CLAUDE_B1.md` |
| Antigravity | `E:\Dev\StoryWeb\.worktrees\antigravity-u3` | `antigravity/u3-studio-reader` | `docs/assignments/ANTIGRAVITY_U3.md` |

## Câu nhắc gửi cho Claude Code

> Hãy đọc `AGENTS.md`, `CLAUDE.md` và `docs/assignments/CLAUDE_B1.md` trong workspace đang mở, rồi thực hiện toàn bộ B1 theo file giao việc. Worktree và nhánh đã tạo sẵn; kiểm tra `git status` trước khi sửa. Cập nhật dòng B1 trên `docs/WORKBOARD.md` trong nhánh của bạn, chạy kiểm tra, commit và bàn giao commit, API contract cùng phần còn thiếu. Không push `main`, không deploy, không chạy migration trên Railway production.

## Câu nhắc gửi cho Antigravity

> Hãy mở đúng worktree `E:\Dev\StoryWeb\.worktrees\antigravity-u3`, đọc `AGENTS.md`, `docs/assignments/ANTIGRAVITY_U3_THEME_FONT.md` và **review mới nhất** `docs/reviews/U3_THEME_FONT_REVIEW_2026-09-23.md`. Sửa 3 lỗi lint, đồng bộ theme khi hệ thống đổi lúc trang đang mở, tăng tương phản chữ dialog tối và dọn trailing whitespace. Giữ kết quả font tiếng Việt và focus dialog đã đạt. Chạy lại typecheck/lint/build/diff check, cập nhật U3 trên workboard, commit nhánh U3 và bàn giao mã commit. Không push `main` hoặc deploy.

Nếu một app đang mở `E:\Dev\StoryWeb` (nhánh `main`), hãy mở đúng worktree của agent trước khi gửi câu nhắc. Không để cả hai app sửa trực tiếp `main`. Sau khi hai bên bàn giao, gửi commit/nhánh cho Codex review và tích hợp.
