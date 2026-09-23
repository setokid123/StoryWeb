# Review U3 lần 2 — font và theme, 23/09/2026

**Trạng thái: cần Antigravity sửa trước khi tích hợp.** Bản hiện tại chưa commit trên nhánh `antigravity/u3-studio-reader`. Đây là review mới nhất; các kết luận về lỗi focus trong `U3_REVIEW_2026-09-23.md` đã được kiểm tra lại bên dưới.

## Đã xác nhận

- Xóa `.next/dev` sinh từ route kiểm thử cũ rồi chạy `npm run typecheck` và `npm run build`: **đạt**. Lần chạy ban đầu lỗi do cache validator của route kiểm thử đã xóa, không phải lỗi code U3.
- Chrome ở viewport CSS 360, 768, 1280 px: màn hình đại diện Sáng/Tối không tràn ngang (`scrollWidth` lần lượt 345, 753, 1265 px). Theme lưu qua reload. Ảnh trong `docs/reviews/screenshots/` có tên `home-*`, `studio-*-*`, `reader-*-*`, `locked-dark-360.png`. Route `review-u3` chỉ là fixture tạm cho kiểm tra, đã xóa; ảnh `home-*` dùng hero và thẻ truyện đại diện, chưa phải ảnh production homepage đầy đủ.
- Chrome đã tải Inter cho UI và Lora cho tiêu đề/đoạn đọc, gồm đoạn mẫu nhiều dấu tiếng Việt. CDP `CSS.getPlatformFontsForNode` cho thấy đoạn đọc và tiêu đề dùng Lora, đoạn mô tả khóa dùng Inter, không rơi về font fallback.
- Dialog khóa đặt focus đầu tiên vào nút đóng; Tab và Shift+Tab giữ focus trong dialog khi thử ở 360 px. Lỗi focus trong review trước đã được sửa.

## Cần sửa

1. **Lint chặn bàn giao:** `npm run lint` báo `react-hooks/set-state-in-effect` tại `src/components/reader-panel.tsx:31`, `src/components/site-header.tsx:15`, `src/components/theme-provider.tsx:17`. Thiết kế lại trạng thái theme/mounted theo external store hoặc cách phù hợp với React 19; không tắt rule chỉ để qua kiểm tra.
2. **Theme hệ thống đổi khi trang đang mở:** từ `prefers-color-scheme: light` sang `dark`, thuộc tính `html[data-theme]` đổi đúng nhưng `.reader-shell` vẫn không có `reader-shell--night` và nút đọc vẫn mang `aria-label="Chế độ tối"`. Header cũng tính icon/nhãn từ `matchMedia` trong render mà không đăng ký trạng thái React, nên cùng nguy cơ lệch. Đồng bộ theme đã resolve cho tất cả nút và trình đọc khi sự kiện hệ thống đổi. Kiểm tra lại cả chiều dark → light.
3. **Tương phản dialog tối:** `.locked-panel p` vẫn dùng `#77827b` trên nền `#263635`, tỷ lệ khoảng **3,17:1** với chữ 13 px. Tăng tương phản lên tối thiểu 4,5:1 cho chữ thường và rà các nhãn/hint tối ở Studio/trình đọc.
4. **`git diff --check` chưa sạch:** khoảng trắng cuối dòng trong `docs/DESIGN_SYSTEM.md` và `src/components/admin-login.tsx`. Dọn trước khi commit.

Sau khi sửa, chạy lại `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`; kiểm tra theme hệ thống trong Chrome và commit U3. Ghi mã commit và kết quả vào `docs/WORKBOARD.md` để Codex tích hợp.
