# U7 — Antigravity: dock kính mờ 4 nút và thanh công cụ trang đọc

Mở `E:\Dev\StoryWeb\.worktrees\antigravity-u7` trên nhánh `antigravity/u7-reader-glass-nav`. Đọc `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKBOARD.md`, `docs/DESIGN_SYSTEM.md`, [kế hoạch U7/M5](../READER_FLOATING_NAV_U7_M5_PLAN.md). Nhận U7 trên workboard trước khi sửa; tra Memory `U7`, `reader-navigation`, `css-tokens`. Khi sửa API React/Next, xem tài liệu Next trong `node_modules/next/dist/docs/` và Context7 theo `docs/MCP_TOOLS.md`.

## Việc của bạn

1. Thiết kế/code component trình bày `ReaderFloatingNavigation` mới. Dock nổi bo tròn, hiệu ứng kính mờ tinh tế: sáng/tối rõ, nền đủ đặc để đọc chữ, viền và bóng có chiều sâu. Desktop/tablet bốn nút một hàng; mobile 320–600px lưới 2×2 **đủ bốn nhãn**: Về truyện, Chương trước, Danh sách chương, Chương sau. Dùng đúng icon và style Thư Các; vùng bấm ≥44px.
2. Giữ `ReaderNavigation` đầy đủ ở cuối chương. Có thể tách markup nhỏ dùng chung, nhưng không làm thay đổi link/disabled hiện có. Trong cả dock và nav cuối, `prevUrl`/`nextUrl` thiếu thì button disabled; link chương dùng `prefetch={false}`. Nút danh sách chương gọi callback do container cung cấp. Hợp đồng props rõ ràng để Claude ghép: `visible`, `storyUrl`, `prevUrl?`, `nextUrl?`, `onOpenChapterList` (truyền nút mở để trả focus) và ref nếu cần.
3. CSS cho `.reader-toolbar` bám đầu viewport **chỉ trong trang đọc**, có trạng thái thu gọn/ẩn do Claude cấp class hoặc data attribute. `.site-header` chung giữ nguyên. Dock đặt cách đáy có tính `env(safe-area-inset-bottom)`, chừa khoảng cuối bài, không che ads/đoạn văn. Chuyển động nhẹ, `prefers-reduced-motion`; fallback gần đặc khi không có `backdrop-filter`. Đặt z-index dưới drawer/dialog. Khi ẩn phải không nhận click/Tab (view nhận `visible`, Claude quản logic).
4. Chỉnh đúng các selector reader liên quan trong `globals.css`/`dark-overrides.css`, tránh ghi đè màu đại trà hoặc thêm nhiều lớp override. Cập nhật design system với token/luật của dock và thanh công cụ.

## Ranh giới

Sở hữu `src/components/reader-floating-navigation.tsx` (mới), `src/components/reader-navigation.tsx` nếu cần, `src/app/globals.css`, `src/app/dark-overrides.css`, `docs/DESIGN_SYSTEM.md`. **Không sửa** `src/components/reader-panel.tsx`, hook scroll/state, `src/lib`, route đọc, DB, migration, package. Nếu view cần prop khác, ghi contract vào workboard và báo Codex/Claude trước khi đổi.

## Bàn giao

Chụp hoặc mô tả kiểm tra thật ở 320/360/768/1280px, Sáng/Tối; thử focus/disabled, reduced motion và fallback blur. Chạy typecheck/lint/build và `git diff --check`. Commit nhánh U7, ghi props, CSS, ảnh/test, giới hạn và `Context7`/`Memory` trên workboard. Không merge `main`, không deploy.

### Câu nhắc đưa vào Antigravity

> Mở worktree `E:\Dev\StoryWeb\.worktrees\antigravity-u7`; đọc `docs/assignments/ANTIGRAVITY_U7.md` và kế hoạch U7/M5, nhận U7 trên workboard. Thiết kế/code dock kính mờ bốn nút đủ chữ (desktop một hàng, mobile 2×2), thanh công cụ reader sticky/ẩn theo class do Claude cấp, cả Sáng/Tối, safe area, focus và reduced motion. Chỉ sửa view/CSS/design system; bàn giao prop contract và ảnh/test, commit nhánh U7.
