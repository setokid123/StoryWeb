# Review U6 — cần sửa trước khi tích hợp (2026-09-24)

Nguồn: `antigravity/u6-visual-hierarchy` tại `c6be7f2` (code `8fc5e16`), so với `main` `ce9a802`. Codex chỉ review; chưa merge U6 vào `main`.

## Kết quả kiểm tra

- `npm run build`, `npm run typecheck`, `npm run lint` và `git diff --check`: **đạt** trên nhánh Antigravity. Không có thay đổi logic unlock/API/DB.
- Chrome headless dùng HTML preview tạm với stylesheet và selector của nhánh U6 (preview đã gỡ). Khi `<html data-theme="dark">`, `getComputedStyle` cho `--bg-site=#eee9e0`, `--bg-surface=#fffdf8`, nền body `rgb(238,233,224)` và nền `.reader-article` `rgb(255,253,248)`: **dark mode vẫn nhận token nền Sáng**. CSS Tối đặt màu tiêu đề `.reader-article h1` là `#e4e5e0`, tương phản trên mặt đọc sáng chỉ khoảng **1,25:1**; chữ tiêu đề gần như biến mất.

## Lỗi chặn tích hợp

1. **Dark token bị ghi đè do thứ tự import.** `globals.css` import `dark-overrides.css` ở dòng đầu. Antigravity khai báo `[data-theme="dark"] { --bg-* ... }` trong file import, nhưng khai báo `:root { --bg-* ... }` mới lại nằm cuối `globals.css`. Hai selector có cùng specificity; `:root` đến sau thắng. Di chuyển token của cả hai theme về cùng một nơi có thứ tự đúng, hoặc đặt dark selector sau light selector trong stylesheet chính. Kiểm `getComputedStyle` trên `html[data-theme=dark]`, rồi đo chữ/nền thực tế.

## Phạm vi cần chứng minh khi bàn giao lại

Diff U6 chỉ đổi trực tiếp `body`, `hero-section`, `story-card`, một số khối Studio/đăng nhập và reader. Các trang tìm kiếm, chi tiết và tủ truyện có CSS cũ nên **có thể** hưởng lợi từ nền website mới, nhưng chưa có ảnh trước/sau để xác nhận thứ bậc thực tế. Chụp và kiểm từng trang; bổ sung selector có phạm vi nếu còn khối chìm.

## Chất lượng bàn giao cần bổ sung

- U6 hiện thêm một khối “Overrides” ở **cuối** mỗi CSS file, trong khi brief yêu cầu rà cascade và hợp nhất selector cũ liên quan. Hãy loại bỏ hoặc hợp nhất rule trùng cho `reader-shell`, `reader-article`, `reader-toolbar`, `reader-nav`, site card và dark mode; tránh để lớp mới phụ thuộc vào thứ tự import khó thấy.
- Workboard ghi “Hoàn thành” nhưng chưa có ảnh trước/sau 360/768/1280px Sáng/Tối, trạng thái free/locked, số đo contrast, hoặc các dòng `Context7`/`Memory` theo `AGENTS.md`. Hai script `append-dark.py`, `append-design.py` còn untracked trong worktree Antigravity; tự xử lý chúng khi bàn giao, Codex không đụng file chưa commit của agent.
- Sau sửa, kiểm cỡ chữ 26px, `data-pref-width` hẹp/rộng, panel tùy chỉnh, toolbar, 4 nút chương và ad slot. Chữ thường cần ≥4.5:1; tiêu đề lớn và dấu hiệu điều khiển quan trọng ≥3:1 trên **nền thực tế** ở cả hai theme.

## Hướng bàn giao lại

Antigravity sửa trên chính nhánh U6, chạy lại ba gate, kèm ảnh và số đo; cập nhật Memory `U6` và workboard với commit mới. Codex sẽ review lại trình duyệt và chỉ tích hợp khi dark mode đọc được. Claude chưa cần tham gia vì thay đổi hiện vẫn thuần CSS/view.

`Context7`: không cần (review CSS, không sửa API thư viện). `Memory`: đã tra U6/gotcha:css-tokens; đã cập nhật I8.
