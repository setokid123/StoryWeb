# M5 — Claude Code: logic hiện/ẩn điều hướng khi cuộn trang đọc

Mở `E:\Dev\StoryWeb\.worktrees\claude-m5` trên nhánh `claude/m5-reader-scroll-nav`. Đọc `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKBOARD.md`, [kế hoạch U7/M5](../READER_FLOATING_NAV_U7_M5_PLAN.md) và [assignment U7](ANTIGRAVITY_U7.md). Nhận M5 trên workboard, tra Memory `M5`, `reader-navigation`, `unlock-grant`. Với API React/Next, xem `node_modules/next/dist/docs/` và Context7 đúng phiên bản.

## Việc của bạn

1. Code hook hoặc state trong `ReaderPanel` để theo dõi hướng cuộn bằng listener passive + `requestAnimationFrame` hoặc cách tương đương. Trên đầu trang dock ẩn, toolbar ở vị trí thường. Cuộn xuống thì toolbar/dock ẩn; cuộn lên đủ khoảng thì hiện; dao động nhỏ không làm nhấp nháy. Gần hết bài dock hiện, nhưng khi nav cuối chương hiện trên viewport thì dock ẩn. Dùng `IntersectionObserver` cho nav cuối nếu phù hợp; cleanup đầy đủ và xử lý khi đổi chương/resize. Tránh cập nhật state trên từng pixel cuộn.
2. Sau khi U7 bàn giao, ghép `ReaderFloatingNavigation` vào `ReaderPanel` với cùng `storyHref`, `navigation.prevHref/nextHref` và chapter-list callback hiện có. Giữ nav cuối. Dock ẩn/không thể Tab khi gate khóa chương hoặc dialog/preferences đang mở; không cướp focus khi nó biến mất. Trả focus về đúng nút đã mở chapter list (dock hoặc nav cuối), không luôn trả về ref cũ ở cuối trang.
3. Gắn class/data attribute cho `.reader-toolbar` để U7 CSS thể hiện sticky/compact/hidden. Chỉ tác động trang đọc; `.site-header` toàn site không đổi. Không sửa quyền đọc, grant 5 phút, unlock, ads, migration, API hay nội dung body chương khóa.
4. Thêm kiểm tra có ý nghĩa cho visibility/focus nếu tách được logic thuần. Kiểm trên trình duyệt hoặc hướng dẫn walkthrough rõ cho Codex; test các trường hợp lên/xuống, gần cuối, cuối nav đã thấy, mở/đóng drawer, chương khóa, mobile và bàn phím.

## File và thứ tự

Bạn sở hữu `src/components/reader-panel.tsx`, hook logic mới (nếu có), script test logic và tài liệu bàn giao. Antigravity sở hữu `reader-floating-navigation.tsx`, `reader-navigation.tsx`, CSS và design system. **Không sửa file U7** trước khi Antigravity bàn giao. Làm hook độc lập trước; sau khi U7 commit và chốt props, merge nhánh `antigravity/u7-reader-glass-nav` vào nhánh M5 rồi ghép view bằng commit M5. Không lấy CSS khi U7 còn dở. Nếu cần sửa `reader-navigation.tsx` để trả trigger focus, yêu cầu U7 thêm prop/callback rồi mới ghép.

## Bàn giao

Chạy typecheck/lint/build, `git diff --check`, test/ảnh hoặc walkthrough thật. Ghi commit, file, contract với U7, hành vi khi disabled/focus/locked, giới hạn và Context7/Memory trên workboard. Không push `main`, không deploy. Codex review/tích hợp/phát hành sau khi cả U7 và M5 đạt.

### Câu nhắc đưa vào Claude Code

> Mở worktree `E:\Dev\StoryWeb\.worktrees\claude-m5`; đọc `docs/assignments/CLAUDE_M5.md` và kế hoạch U7/M5, nhận M5. Code logic hiện/ẩn theo scroll và focus return trong `ReaderPanel`/hook, ghép view dock U7 sau bàn giao. Giữ quyền đọc server, body chương khóa, unlock và nav cuối nguyên nghĩa. Không sửa CSS/view U7. Chạy typecheck/lint/build, test, commit M5 và bàn giao.
