# Định hướng UI/UX — Thư Các

## Tinh thần

Một thư viện số yên tĩnh, giàu chất biên tập. Ưu tiên đọc lâu trên điện thoại. Bản dựng dùng bìa tạo bằng CSS để tránh phụ thuộc ảnh bên ngoài; có thể thay bằng bìa có bản quyền về sau.

## Màu và chữ

- Hai chế độ (Sáng/Tối) áp dụng trên toàn site, thiết kế có chiều sâu thay vì chỉ đảo ngược màu.
- Sáng: Nền giấy `#fbf9f5`, nền ấm `#f5f1e9`, chữ `#27313a`. Điểm nhấn đất nung `#ad624b`; xanh đậm `#182e35`.
- Tối: Nền giấy tối `#192426`, nền bề mặt `#1f2d2f`, chữ `#e4e5e0`. Điểm nhấn `#d38d78`.
- Phông chữ tiếng Việt:
  - **Lora (Serif)**: Dùng cho tiêu đề và nội dung chương. Lora mang lại cảm giác văn học cổ điển, bộ dấu tiếng Việt mượt mà, hỗ trợ tốt cho việc đọc đoạn văn dài mà không gây mỏi mắt. Cỡ chữ 400, 500, 600, 700. Fallback: Georgia, 'Times New Roman'.
  - **Inter (Sans-serif)**: Dùng cho điều hướng, nhãn, nút, giao diện UI. Tối ưu hóa độ rõ nét màn hình nhỏ. Cỡ chữ 400, 600, 700, 800. Fallback: Arial, Helvetica.
  - Sử dụng `next/font/google` subset `vietnamese` để tối ưu tải phông.
- Cỡ chữ đọc mặc định 19px, cho chỉnh 16–26px. Dòng chữ rộng tối đa 720px, line-height xấp xỉ 2.

## Component và trạng thái

- `SiteHeader`: desktop nav, menu mobile, tìm kiếm.
- `StoryCard` + `Cover`: thẻ truyện có bìa, tác giả, rating và số chương.
- `ReaderPanel`: cỡ chữ, chế độ tối, chương trước/sau; trạng thái chương khóa riêng.
- `BookshelfButton/List`: lưu localStorage trong bản dựng, cần đồng bộ tài khoản ở giai đoạn backend.
- `Thư Các Studio` (`/panel`): sidebar quản trị, thống kê, danh sách truyện, metadata, trình soạn chương và hành động lưu bản nháp/xuất bản.
- Gate chương khóa: dialog hiện khi vào chương từ số 2; nút liên kết chỉ hiện khi cấu hình được bật. Quyền đọc kéo dài 5 phút và được kiểm tra lại khi sang chương.
- Nút phải có focus rõ, vùng chạm đủ rộng; link có mô tả ý nghĩa; trạng thái rỗng có lời dẫn và hành động tiếp.

## Màn hình Antigravity cần thiết kế tiếp

1. Đăng nhập/đăng ký và tủ truyện có tài khoản.
2. Rà soát panel hiện tại ở mobile; bổ sung ảnh bìa, preview, lịch xuất bản và trạng thái upload/import chương.
3. Rà soát dialog chương khóa: điều kiện rõ ràng, trạng thái chưa cấu hình, link mở tab mới, thời gian còn lại và lỗi.
4. Thẻ Shopee Affiliate dạng khối gợi ý tách khỏi luồng mở khóa, ghi nhãn liên kết tiếp thị.

Kiểm tra ở 360px, 768px, 1280px; cả bàn phím, độ tương phản và nội dung dài. Không tự bật luồng Shopee khi chưa có chấp thuận riêng.

## Studio đăng truyện

- Ở màn hình nhỏ, thư viện truyện vẫn hiển thị và cuộn ngang để có thể đổi tác phẩm. Chương cũng cuộn ngang; mục đang chọn có viền nhấn và trạng thái `aria-current`.
- Trình soạn thảo cho thấy bản nháp/đã đăng và nhãn **Chưa lưu**. Khi đổi truyện, tạo truyện mới, đăng xuất hoặc đóng tab với nội dung chưa lưu, cần cảnh báo mất dữ liệu.
- Lưu bản nháp chỉ cần tên và đường dẫn hợp lệ. Xuất bản yêu cầu thêm tác giả, mô tả, tiêu đề và nội dung cho từng chương. Lỗi hiển thị ngay trong panel, có `role="alert"`; trạng thái lưu/xóa có thông báo riêng.
- Không hiện nút tải ảnh bìa khi chưa có lưu trữ ảnh/API tương ứng. Bìa hiện là hình tạo bằng CSS từ dữ liệu truyện; tác giả sẽ cần luồng tải ảnh và xem trước khi backend hỗ trợ.
- Các nút thao tác cần trạng thái chờ, vùng nhấn tối thiểu khoảng 40px và focus rõ. Đăng nhập báo lỗi cạnh trường mật khẩu, không làm mất giá trị người dùng vừa nhập khi kết nối thất bại.
