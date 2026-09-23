# Giao việc hiện tại cho Claude Code và Antigravity

M2 và U4 bắt đầu từ cùng một commit `main` trên **hai worktree mới**. Mở đúng thư mục trong từng extension VS Code, rồi gửi câu nhắc bên dưới. Các file `CLAUDE_B1.md`, `ANTIGRAVITY_U3.md` và `ANTIGRAVITY_U3_THEME_FONT.md` là lịch sử đã hoàn tất, không phải nhiệm vụ hiện tại.

| Agent | Thư mục mở trong VS Code | Nhánh | File giao việc |
| --- | --- | --- | --- |
| Claude Code | `E:\Dev\StoryWeb\.worktrees\claude-m2` | `claude/m2-ads-unlock-logic` | `docs/assignments/CLAUDE_M2.md` |
| Antigravity | `E:\Dev\StoryWeb\.worktrees\antigravity-u4` | `antigravity/u4-reader-ads-ui` | `docs/assignments/ANTIGRAVITY_U4.md` |

## Câu nhắc gửi cho Claude Code

> Mở worktree `E:\Dev\StoryWeb\.worktrees\claude-m2`. Đọc `AGENTS.md`, `CLAUDE.md`, `docs/ADS_UNLOCK_PLAN.md`, `docs/assignments/CLAUDE_M2.md` và `docs/WORKBOARD.md`; nhận M2 trên workboard. Từ nay bạn code toàn bộ logic dự án, cả client và server, không chỉ backend. Hãy xây settings/admin API, hai mode mở khóa, bảo vệ quyền đọc 5 phút, state và tích hợp display ads theo assignment. Rewarded chỉ bật khi provider web có bằng chứng server xác minh được; nếu chưa có thì giữ fail-closed. Antigravity làm view U4; phối hợp bằng typed props và ghép view sau khi U4 commit. Chạy test/typecheck/lint/build, commit nhánh M2 và bàn giao; không sửa CSS của Antigravity, không push main/deploy/migration production.

## Câu nhắc gửi cho Antigravity

> Mở worktree `E:\Dev\StoryWeb\.worktrees\antigravity-u4`. Đọc `AGENTS.md`, `.agents/rules/project-context.md`, `docs/ADS_UNLOCK_PLAN.md`, `docs/assignments/ANTIGRAVITY_U4.md` và `docs/WORKBOARD.md`; nhận U4 trên workboard. Bạn chỉ thiết kế và code giao diện: bốn nút điều hướng trong ảnh, drawer danh sách chương, block quảng cáo, dialog khóa hai mode và trang switch admin. Làm view nhận props/callback, không tự code API, entitlement, state hoặc provider. Kiểm tra Sáng/Tối ở 360/768/1280 px, bàn phím, typecheck/lint/build; commit nhánh U4 và bàn giao props/ảnh. Không push main hoặc deploy.

Antigravity bàn giao view trước bước Claude ghép với logic. Nếu cả hai cần cùng một file, ghi yêu cầu vào workboard và dùng thứ tự bàn giao; không sửa đè worktree khác. Codex review và tích hợp sau cùng.
