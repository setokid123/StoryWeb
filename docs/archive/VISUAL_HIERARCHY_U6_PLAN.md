# U6 — Phân tầng giao diện Thư Các

## Vấn đề hiện tại

Ở trang đọc, `.reader-article` không có bề mặt riêng nên nằm trực tiếp trên nền `.reader-shell`. Cả hai theme đều thiếu ranh giới rõ giữa **website → trang sách → công cụ đọc**; dark mode dùng nhiều tông xanh đậm rất gần nhau. Các trang danh mục, chi tiết truyện và Studio cũng có một số khối cùng tông nền, khiến thông tin quan trọng chìm. CSS trang đọc đang nằm ở nhiều đoạn trong `globals.css` và `dark-overrides.css`; U5 đã từng gặp lỗi khi thay chuỗi màu toàn file.

## Hướng mỹ thuật

Giữ chất “thư viện số yên tĩnh, giàu biên tập” của `DESIGN_SYSTEM.md`, nhưng tạo ba lớp có vai trò rõ:

| Lớp | Vai trò | Sáng | Tối |
| --- | --- | --- | --- |
| Nền website | Khung bao, tạo khoảng nghỉ | Màu giấy ấm hơi trầm | Than xanh rất đậm |
| Mặt đọc | Trọng tâm thị giác | Tờ giấy gần trắng, viền/bóng rất nhẹ | Mặt đọc sáng hơn nền bao, viền có sắc độ rõ |
| Điều khiển và khối phụ | Toolbar, điều hướng, bộ lọc, ad slot | Trung tính nhạt, ít cạnh tranh với chữ | Trung tính cao hơn nền, không dùng màu nhấn đại trà |

Bảng màu gợi ý để Antigravity thử, **chưa phải token cố định**: nền ngoài sáng `#eee9e0`, mặt đọc `#fffdf8`, chữ `#263433`; nền ngoài tối `#101b1d`, mặt đọc `#253538`, chữ `#f1eee6`. Màu đất nung hiện có dành cho CTA và trạng thái chọn. Chốt màu bằng ảnh thật và đo độ tương phản, không chỉ xem mã hex.

### Trang đọc — ưu tiên số 1

1. Tạo “trang sách” riêng trên desktop/tablet: `reader-article` có nền, khoảng đệm, viền/bóng tiết chế; phần chữ nằm trong cột căn giữa. Thanh công cụ ở lớp riêng phía trên; cụm 4 nút chương ở lớp riêng bên dưới. Tiêu đề truyện/chương, thân bài và “Hết chương” có nhịp cách đều và ranh giới dễ thấy.
2. Mobile 360px: mặt đọc gần tràn chiều ngang với lề thoáng, không làm cột chữ hẹp bởi card dày/bóng lớn. Không tạo cuộn ngang ở cỡ chữ 26px hoặc tên chương dài.
3. Giữ độ dài dòng đọc dễ theo dõi; `data-pref-width` hiện cung cấp 560/660/720px. Thiết kế khung phải chứa được tùy chọn rộng nhất mà không làm sai preference. Kiểm cả Lora/Inter, thường/đậm, căn trái/đều, giãn dòng và theme hệ thống.
4. Panel khóa chương nằm rõ trong mặt đọc nhưng không giả làm body chương; quảng cáo cuối trang là khu vực riêng, có nhãn, nằm ngoài mặt đọc. Không đưa body chương khóa xuống client và không đổi điều kiện hiển thị quảng cáo hiện có.
5. Toolbar, panel tùy chỉnh, drawer chương và điều hướng có surface/viền/focus thống nhất; trạng thái disabled vẫn đọc được. Không tăng độ nổi bằng hiệu ứng mạnh liên tục khi đọc lâu.

### Toàn website — sau khi chốt trang đọc

- Trang chủ, tìm kiếm, chi tiết truyện, tủ truyện: phân biệt nền trang với section, card truyện, filter/search và khối thông tin phụ bằng token bề mặt; tiêu đề section và CTA có thứ bậc rõ. Giữ bìa truyện là điểm nhấn, hạn chế gradient/bóng trang trí cạnh nội dung dài.
- Header/footer và Studio: dùng cùng hệ màu, nhưng Studio vẫn là giao diện công cụ. Rà light/dark của sidebar, editor, nút và feedback để không còn khối chìm vào nền.
- Chỉ sửa markup của component trình bày khi CSS không đủ; giữ dữ liệu, href, callback, trạng thái và thứ tự đọc bằng bàn phím.

## Quy trình U6

1. Chụp trạng thái **trước**: trang đọc chương miễn phí/khóa ở 360, 768, 1280px trong Sáng/Tối; thêm trang chủ và chi tiết truyện. Ghi 3–5 điểm chìm/bất nhất.
2. Phác hai hướng bề mặt nhỏ (mặt đọc sáng/tối và một thẻ truyện); tự chọn một hướng dựa trên khả năng đọc, sự nhất quán và độ tương phản, rồi code.
3. Tạo token bề mặt có vai trò, chỉnh CSS theo selector có phạm vi. Hợp nhất hoặc loại bỏ override cũ liên quan nếu cần; **không replace màu/toàn file hàng loạt**, không thêm chuỗi override cuối file để che lỗi cascade.
4. Hoàn thiện trang đọc trước; sau đó áp dụng cùng token cho trang chủ/tìm kiếm/chi tiết/tủ truyện/Studio. Cập nhật `DESIGN_SYSTEM.md` với token, spacing, card và ví dụ Sáng/Tối.
5. Chụp **sau**, kiểm bàn phím/focus, preference, locked/unlocked, mobile và chạy typecheck/lint/build. Codex review visual, CSS cascade, bảo mật luồng đọc rồi mới tích hợp.

## Ranh giới Antigravity / Claude

U6 là việc giao diện của Antigravity. CSS và các component trình bày có đủ điểm bám hiện tại; **chưa giao task cho Claude**. Antigravity không sửa `src/lib/**`, API, DB, unlock/cookie hay state của `reader-panel.tsx`. Nếu thực sự cần cấu trúc React mới trong container đang giữ logic, Antigravity tạo view thuần nhận props/children và ghi contract vào bàn giao; Codex sẽ mở task Claude riêng để ghép. Không để hai agent cùng sửa `globals.css`.

## Tiêu chí nghiệm thu

- Ảnh trước/sau tại 360, 768, 1280px cho trang đọc ở cả Sáng/Tối; người xem phân biệt được nền website, mặt đọc, thanh công cụ và cụm điều hướng khi nhìn lướt. Có thêm ảnh trang chủ/chi tiết và trạng thái khóa.
- Không tràn ngang; cỡ chữ 16–26px, cột hẹp/rộng, Lora/Inter và bold vẫn nằm gọn. Header/toolbar và 4 nút chương dùng được bằng bàn phím, vùng chạm tối thiểu 44px.
- Chữ thường đạt tối thiểu 4.5:1, chữ lớn 3:1; dấu hiệu điều khiển quan trọng đạt 3:1 theo WCAG. Kiểm trực tiếp các cặp màu trên **nền thực tế** của cả hai theme.
- Không thay quyền đọc, đường dẫn, vị trí ad slot hoặc trạng thái lưu preference. Chương khóa không có body trong HTML/RSC; test bảo mật hiện có vẫn đạt sau khi tích hợp.
- `npm run typecheck`, `npm run lint`, `npm run build` đạt; bàn giao commit, danh sách file, ảnh/walkthrough và rủi ro còn lại.

## Tham khảo nguyên tắc

- [Material 3: vai trò bề mặt và phân tầng bằng sắc độ](https://developer.android.com/codelabs/m3-design-theming) — tham khảo cách đặt vai trò, không sao chép visual.
- [U.S. Web Design System: độ dài dòng văn bản](https://designsystem.digital.gov/components/typography/) — mục tiêu gần 66 ký tự cho đoạn dài, tùy font và cỡ chữ.
- [W3C WCAG: tương phản chữ](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) và [tương phản điều khiển](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast).
- [Readwise Reader: tùy chỉnh hiển thị khi đọc](https://docs.readwise.io/reader/docs/faqs/appearance) — tham khảo cách giữ công cụ đọc gọn và nhất quán.
