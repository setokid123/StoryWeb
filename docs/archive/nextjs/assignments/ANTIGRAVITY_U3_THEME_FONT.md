# Bổ sung U3 — font tiếng Việt và giao diện Sáng/Tối

**Yêu cầu mới của người dùng:** chữ tiếng Việt đang hiển thị dấu chưa đẹp; giao diện hiện quá đơn giản. Antigravity hoàn thiện kiểu chữ và thiết kế hai chế độ **Sáng** / **Tối** cho toàn website. Làm sau khi sửa lỗi focus dialog trong `docs/reviews/U3_REVIEW_2026-09-23.md`, trên chính worktree `antigravity/u3-studio-reader` hiện tại. Không sửa trực tiếp `main` hoặc deploy.

## Kiểu chữ tiếng Việt

1. Kiểm tra font thực tế hiện dùng: `src/app/globals.css` đặt `--serif: Georgia, 'Times New Roman', serif` và `--sans: Arial, Helvetica, sans-serif`. Ảnh review cho thấy dấu tiếng Việt ở tiêu đề/chương chưa đồng đều. Xác định lỗi do glyph fallback, font, letter spacing, line height hay tải font trước khi sửa.
2. Chọn cặp font đọc lâu dễ chịu, có bộ glyph tiếng Việt đầy đủ ở các trọng lượng và kiểu nghiêng đang dùng. Dùng `next/font` với subset tiếng Việt hoặc font local có giấy phép phù hợp; đọc `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` trước khi triển khai. Tránh font tải từ CDN mỗi lần người đọc mở trang. Ghi tên font, trọng lượng, fallback và lý do chọn trong `docs/DESIGN_SYSTEM.md`.
3. Kiểm tra trực quan chuỗi: **“Tiếng Việt: ă â ê ô ơ ư đ; Ắ Ầ Ễ Ộ Ở Ự; Nguyễn, Trường, Quản lý truyện & chương”** ở tiêu đề, đoạn truyện, nút, form; cả chữ thường, chữ hoa và chữ nghiêng. Không để dấu tách khỏi thân chữ, cắt trên/dưới hoặc đổi font giữa các ký tự trong cùng từ. Kiểm tra cỡ chữ đọc 16–26 px, đặc biệt trên Windows Chrome và màn hình 360 px.

## Hai theme cho toàn site

1. Thiết kế lại theme **Sáng** với nền trắng ngà/giấy, cấp độ bề mặt rõ, chữ dễ đọc, điểm nhấn đất nung/xanh đậm. Thiết kế theme **Tối** bằng bảng màu riêng có chiều sâu và tương phản tốt; không chỉ đảo màu hoặc làm tối riêng trang đọc.
2. Áp dụng nhất quán cho header/menu, trang chủ, danh sách/tìm kiếm, chi tiết truyện, thẻ và bìa, trình đọc, dialog chương khóa, tủ truyện, màn hình đăng nhập và Studio. Các trạng thái hover/focus/selected/disabled/loading/error/success đều phải rõ trong cả hai theme. Giữ nội dung truyện là trọng tâm, thêm phân cấp thị giác, nhịp khoảng trắng, chi tiết bìa và nút vừa đủ để giao diện có cá tính hơn.
3. Có nút chuyển **Sáng/Tối** dễ tìm bằng chuột và bàn phím, tên truy cập rõ, lưu lựa chọn qua lần tải trang sau. Tôn trọng thiết lập hệ thống khi người dùng chưa chọn. Đồng bộ nút chế độ tối hiện có ở trang đọc với theme toàn site; tránh hai trạng thái mâu thuẫn. Tránh nháy theme sai khi tải hoặc lỗi hydration.
4. Giữ luồng đọc/chương khóa, quy tắc chương 1 miễn phí và phân quyền server như hiện tại. Không thêm popup tự mở, chuyển hướng tự động, ảnh không rõ quyền sử dụng hoặc thư viện UI mới khi chưa ghi nhận lý do. Không đổi API/backend hoặc chạm `src/db/**`.

## Phạm vi file và phối hợp

Antigravity tiếp tục sở hữu `src/app/globals.css`, `src/components/reader-panel.tsx`, `src/components/publishing-panel.tsx`, `src/components/admin-login.tsx` và `docs/DESIGN_SYSTEM.md`. Được mở rộng sang `src/app/layout.tsx`, các component giao diện như `site-header`, `site-footer`, `cover`, `story-card`, `bookshelf-*` và một component chuyển theme mới khi cần. Ghi danh sách file thực sửa trên `docs/WORKBOARD.md` trước khi sửa. Nếu cần đổi page server hoặc file Claude Code đang sở hữu, ghi yêu cầu phối hợp trên workboard rồi xử lý theo thứ tự; giữ nguyên contract props/API.

## Bàn giao và nghiệm thu

- Khắc phục lỗi focus dialog ở file review và kiểm tra Tab/Shift+Tab, Enter/Space, Escape khi phù hợp.
- Ở viewport CSS 360/768/1280 px: không tràn ngang; font tiếng Việt rõ; header, thẻ truyện, Studio và thanh đọc không che nội dung trong cả hai theme.
- Chụp ảnh **Sáng/Tối** tại 360 và 1280 px cho trang chủ, trang đọc và Studio; thêm ảnh trạng thái khóa và một ảnh 768 px. Đính kèm mẫu chữ tiếng Việt ở hai theme. Ghi hạn chế nếu không thể chụp một trạng thái.
- Kiểm tra theme lưu qua reload, mặc định theo hệ thống, không nháy sai theme và không báo hydration mismatch. Kiểm tra keyboard và tương phản cho nút, form, dialog.
- Chạy `npm run typecheck`, `npm run lint`, `npm run build`; commit trên nhánh U3 và bàn giao mã commit, file đã đổi, ảnh, lỗi còn lại. Codex review trước khi tích hợp `main`.
