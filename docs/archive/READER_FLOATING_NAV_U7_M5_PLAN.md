# U7 / M5 — Thanh điều hướng kính mờ trên trang đọc

## Mục tiêu đã chốt với người dùng

Trên trang `/doc/[slug]/[chapter]`, giữ cụm điều hướng đầy đủ **Về truyện · Chương trước · Danh sách chương · Chương sau** ở cuối chương và thêm một dock nổi dùng cùng bốn nhãn khi người đọc cuộn. Dock có cảm giác kính mờ kiểu iPhone nhưng vẫn hợp màu/chữ Thư Các, không che nội dung. Thanh công cụ trang đọc (Mục lục, theme, tùy chỉnh) bám đầu màn hình, thu gọn và ẩn khi cuộn xuống; hiện khi cuộn lên. Header chung `.site-header` ở các trang khác không đổi.

## Hành vi

1. Khi vừa vào chương, người đọc thấy thanh công cụ ở vị trí thường; dock nổi chưa hiện. Sau khi qua phần đầu bài, cuộn **xuống** thì thanh công cụ/dock thu ẩn để ưu tiên chữ. Cuộn **lên** một đoạn đủ rõ thì hai thanh hiện; tránh nhấp nháy khi rung tay vài pixel. Gần hết nội dung, dock hiện để chuyển chương; khi cụm điều hướng cuối chương lọt vào viewport thì dock ẩn để không có hai bản cùng lúc.
2. Dock có đúng bốn thao tác và đúng đích như `ReaderNavigation`: link về truyện, chương trước/sau với `prefetch={false}`, nút mở `ChapterListDialog`. Chương đầu/cuối dùng trạng thái disabled thật, không tạo link giả. Không thay đổi URL, unlock, cookie, dữ liệu chương hoặc quyền đọc.
3. Desktop/tablet: bốn nút trên một hàng trong dock nổi bo tròn, căn giữa, chiều rộng vừa nội dung. Mobile khoảng 320–600px: lưới 2×2, giữ **đầy đủ chữ** và vùng chạm tối thiểu 44×44px. Chừa `env(safe-area-inset-bottom)` và khoảng cuối bài để dock không che văn bản, quảng cáo hoặc nút cuối chương.
4. Nền dock bán trong suốt, blur nhẹ, viền sáng mảnh, bóng mềm. Nền thực tế phải đủ đặc để chữ/nút đọc được khi đi qua cả trang giấy sáng, ảnh bìa và nền tối; có nền gần như đặc khi trình duyệt không hỗ trợ `backdrop-filter`. Không dùng hiệu ứng làm mờ nội dung bài viết. Animation ngắn, tắt hoặc giảm khi `prefers-reduced-motion`.
5. Khi dock ẩn hoặc drawer/preferences/khóa chương đang chiếm focus, dock không nhận Tab/click. Nếu người dùng mở danh sách chương từ dock, đóng drawer trả focus đúng nút dock; nếu mở từ cụm cuối chương, trả về nút cuối chương. Không làm hỏng trap focus hiện có của chương khóa, drawer và bảng tùy chỉnh.

## Phân công và hợp đồng

- **U7 / Antigravity:** thiết kế/code view `ReaderFloatingNavigation` (file mới), chỉnh `ReaderNavigation` nếu cần dùng chung markup/props, CSS trang đọc ở `globals.css` và `dark-overrides.css`, cập nhật `DESIGN_SYSTEM.md`. View nhận `visible`, `storyUrl`, `prevUrl`, `nextUrl`, `onOpenChapterList` và ref/trigger theo contract U7; không tự đăng ký scroll listener, không sửa `ReaderPanel`, quyền đọc hoặc backend.
- **M5 / Claude Code:** code logic scroll/visibility trong hook hoặc `ReaderPanel`, lấy vị trí cuối chương qua ref/IntersectionObserver, ghép view U7 sau khi Antigravity bàn giao. Quản lý trigger focus khi mở drawer, trạng thái khi khóa chương, thay chương, đổi viewport/theme; cleanup listener/observer. Không sửa CSS/design view U7. Claude có thể làm hook độc lập trước khi U7 chốt props.
- **Codex:** review hợp đồng, tích hợp hai nhánh, kiểm tra browser, build và phát hành sau khi cả hai bàn giao. Không cho hai agent sửa `src/app/globals.css` hoặc `reader-panel.tsx` đồng thời.

## Nghiệm thu

- Kiểm trên 320/360/768/1280px, Sáng/Tối, chương thường và chương khóa; không tràn ngang, không che đoạn cuối/ads, không rung dock khi cuộn nhẹ, không xuất hiện hai nav cùng lúc.
- Bốn nhãn đầy đủ; vùng chạm ≥44px; màu chữ/nền, focus-visible và disabled rõ ở hai theme. Bàn phím Tab/Shift+Tab/Escape, focus return, `prefers-reduced-motion`, trình duyệt không có blur.
- Cả link trang đọc thường và link chương khóa đều giữ `prefetch={false}`; server vẫn không gửi body chương khóa khi chưa có quyền. Không thay đổi DB/migration/env/ads.
- Mỗi agent chạy `npm run typecheck`, `npm run lint`, `npm run build`, ghi ảnh hoặc walkthrough thật và commit nhánh riêng. Codex kiểm tra tích hợp bằng browser trước khi deploy.
