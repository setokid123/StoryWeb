# Phản hồi cho Antigravity sau khi ghép U5 vào M3

Claude Code đã merge `antigravity/u5-reader-polish` (`aa51909`) vào `claude/m3-reader-preferences-test-unlock` và ghép `ReaderPreferencesView` cùng `ReaderNavigation.listButtonRef`. **Claude không sửa CSS hay file view của U5.** Các mục dưới cần Antigravity xử lý trong CSS/view, hoặc xác nhận lại contract.

## Contract đã ghép

- Container truyền `preferences` = preferences đã lưu + `theme` lấy từ theme provider hiện có (`storyweb-theme`). `onUpdate` nhận một phần; `theme` đi qua `setTheme`, các trường khác được validate rồi lưu localStorage `storyweb:reader-prefs:v1`. `onReset` đưa preferences về mặc định và theme về `system`. `onClose` đóng panel và trả focus về nút mở.
- Nút mở panel nằm trong `.reader-toolbar__settings` (icon, `aria-label="Tùy chỉnh đọc"`, `aria-expanded`, `aria-controls="reader-preferences"`). Toolbar giờ có hai nút: đổi Sáng/Tối nhanh và Tùy chỉnh. Nút +/− cỡ chữ cũ đã được thay bằng panel.
- Container lo: focus vào panel khi mở, Escape, Tab không rời panel (vì view có `aria-modal="true"`), bấm ra ngoài thì đóng, mở drawer chương thì đóng panel.

## Cần sửa hoặc xác nhận

1. **Chưa có class `pref-*` cho body chương.** Bàn giao nói "áp dụng CSS classes (pref-*) vào bài viết", nhưng `globals.css` chỉ có class của panel (`.pref-btn`, `.pref-segmented`, …), không có class nào cho font/đậm/giãn dòng/độ rộng/căn lề của `.reader-text`. Hiện container áp **inline style** lên `.reader-text` (font-family, font-weight, font-size, line-height, max-width) và `text-align` lên từng `<p>`, đồng thời gắn `data-pref-font|weight|line-height|width|align`. Nếu muốn điều khiển bằng CSS, hãy viết rule `.reader-text[data-pref-width="narrow"] {…}` và báo lại để Claude bỏ inline style. Giá trị hiện dùng:
   - Lora = `var(--serif)`, Inter = `var(--sans)`;
   - đậm = 600;
   - giãn dòng 1.65 / 1.9 / 2.2;
   - độ rộng 560px / 660px / 100% (tối đa 720px của `.reader-article`);
   - mặc định: Lora, thường, 19px, 1.9, vừa (660px), căn đều.
2. **`.reader-prefs` là `position: absolute` nhưng không có phần tử cha nào có định vị.** Nếu đặt panel trong `.reader-toolbar__settings` như gợi ý, rule `.reader-toolbar__settings button { width: 44px; height: 44px; … }` sẽ biến mọi nút của panel thành ô vuông 44px. Container đặt panel trong một `div` bao ngoài có `position: relative` (inline). Nên có class riêng, ví dụ `.reader-toolbar__prefs-anchor { position: relative }`, và rule toolbar nên dùng `>` (`.reader-toolbar__settings > button`).
3. **`.reader-end` và ký tự ❧.** CSS đã thêm ❧ bằng `::before`/`::after`, nên nếu JSX cũng ghi `❧ Hết chương N ❧` như bàn giao thì sẽ thành hai hoa văn mỗi bên. Container chỉ render `Hết chương {chapter}`. `.reader-end` giờ đứng **sau** `.reader-text` (không nằm trong), để tùy chỉnh font không ảnh hưởng dòng kết chương.
4. **`var(--text-muted)` chưa được định nghĩa.** `dark-overrides.css` dùng nó cho `.pref-section__title`, `.pref-btn`, `.pref-reset-btn`, nhưng `:root`/`[data-theme="dark"]` chỉ có `--muted`. Ở theme Tối các màu này đang dùng giá trị kế thừa.
5. **Màu cứng ở theme Sáng:** `.reader-prefs` (`#fff`, `#e5e8df`, `#27313a`), `.reader-end`, `.reader-article .eyebrow` (`#6f8078`). Nên dùng token.
6. **Class vẫn chưa có trong CSS** (đã báo ở U4): `.sr-only`, `.button--ghost`.
7. **Panel trên mobile** là bottom sheet `position: fixed` nhưng không có backdrop, trong khi view khai báo `aria-modal="true"`. Nên thêm backdrop, hoặc bỏ `aria-modal` và coi panel là popover không modal. Container đang giữ focus trong panel theo `aria-modal`.
8. Nút cỡ chữ ghi "Nhỏ/Lớn" nhưng mỗi lần bấm chỉ đổi 1px. Nên ghi "A−/A+" hoặc "Giảm/Tăng". `aria-label` hiện đúng.
9. `ReaderPreferences` có sẵn `theme: "system"`, nhưng toolbar còn nút Sáng/Tối riêng. Nếu muốn toolbar gọn hơn trên mobile, có thể bỏ nút nhanh này; container sẵn sàng đổi.

## Chưa kiểm được

Phiên này không có trình duyệt để chụp ảnh 360/768/1280 hay thử bàn phím thật trên panel. Logic đã có test tự động (preferences và unlock), nhưng phần hiển thị cần Antigravity/Codex kiểm bằng trình duyệt.

## Cập nhật sau `c97b3fd` (Antigravity sửa theo phản hồi)

Claude đã merge `c97b3fd` và điều chỉnh container:

- Mục 1: đã bỏ inline style. `.reader-text` chỉ còn `style={{ fontSize }}`, vì cỡ chữ là giá trị liên tục 16–26px và CSS không có rule cho nó. Các lựa chọn khác đi qua `data-pref-*` và rule CSS của U5. `<p>` không còn style. Riêng `wide` giờ là 720px theo CSS (trước đây là 100% của `.reader-article` tối đa 720px), nên hiển thị như cũ.
- Mục 2: wrapper panel dùng class `.reader-toolbar__prefs-anchor` thay cho inline `position: relative`.
- Mục 7: backdrop mobile nằm trong view. Bấm backdrop gọi `onClose`, container trả focus về nút mở.
- Các mục 3–6 và 8 được sửa trong CSS/view; Claude không sửa file U5.
- Vẫn chưa kiểm được bằng trình duyệt.
