# U5 — Antigravity: thiết kế và code giao diện trang đọc

Mở `E:\Dev\StoryWeb\.worktrees\antigravity-u5` trên nhánh `antigravity/u5-reader-polish`. Đọc `AGENTS.md`, `.agents/rules/project-context.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKBOARD.md`, `docs/DESIGN_SYSTEM.md` và `docs/READER_U5_M3_PLAN.md`. Nhận U5 trên workboard trước khi sửa. Đọc guide Next.js tương ứng trong `node_modules/next/dist/docs/` trước khi đổi component Next.

## Công việc

1. Làm tên truyện phía trên `h1` dễ đọc và dòng “Hết chương N” nổi bật vừa đủ, giữ không khí trang đọc hiện tại. Xử lý tên truyện/chương dài, tiếng Việt, khoảng cách trước/sau quảng cáo.
2. Thiết kế lại `ReaderNavigation` thành **một cụm bốn nút căn giữa, cùng một thiết kế**, không chia nút trái/phải. Desktop một hàng; mobile 2×2, mỗi vùng chạm ít nhất 44px. Thể hiện disabled đầu/cuối, hover/focus. Không đổi href, callback hay logic drawer.
3. Tạo view panel “Tùy chỉnh đọc” để Claude truyền giá trị/callback: họ chữ, độ đậm, cỡ chữ, giãn dòng, độ rộng cột, căn chữ, theme và reset. Thiết kế mẫu xem trước ngắn nếu phù hợp; panel không che nội dung/không làm toolbar quá dày trên mobile. Trạng thái mở/đóng, giá trị lưu và hành vi thao tác do Claude phụ trách.
4. Hoàn thiện trạng thái khóa và đoạn cuối trang để nút mở khóa/test dễ hiểu; link ngoài phải có nhãn rõ. Không tự tạo popup hoặc tự mở link.
5. Cập nhật `docs/DESIGN_SYSTEM.md`; bàn giao ảnh hoặc walkthrough tại 360/768/1280px, cả Sáng/Tối. Thử bàn phím và các trạng thái locked/unlocked, đầu/cuối truyện.

## Sở hữu file và contract

U5 sở hữu `src/components/reader-navigation.tsx`, view mới gợi ý `src/components/reader-preferences-view.tsx`, `src/app/globals.css`, `src/app/dark-overrides.css`, `docs/DESIGN_SYSTEM.md`. Có thể tạo view tĩnh cho heading/end nếu cần, nhưng **không sửa** `src/components/reader-panel.tsx`, `src/lib/**`, `src/app/api/**`, `src/app/doc/**`, `src/db/**`, `drizzle/**`, `.env.example` hay `package.json`. Claude tích hợp phần view vào container.

Đề xuất export `ReaderPreferencesView` nhận một object giá trị đã validate và callbacks cho từng lựa chọn, `onReset`, `onClose`; không truy cập localStorage, `window`, fetch hoặc API từ view. Ghi type/props cuối cùng vào `docs/WORKBOARD.md` hoặc file handoff U5, rồi báo Claude. Giữ props hiện có của `ReaderNavigation` nếu có thể.

## Bàn giao

Chạy `npm run typecheck`, `npm run lint`, `npm run build`. Commit nhánh U5, ghi commit, file đã sửa, ảnh/walkthrough và vấn đề còn lại trên workboard. Không push `main`, không deploy và không sửa worktree Claude.
