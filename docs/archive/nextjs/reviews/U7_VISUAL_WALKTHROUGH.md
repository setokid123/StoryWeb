# Báo cáo Tương tác & Đo đạc Giao diện (Walkthrough U7)

*Báo cáo được khởi tạo và đo đạc tự động bởi Antigravity Playwright.*

## Kích thước 320px
- **Bố cục (Inner)**: `grid`, Cột: `127px 127px`
- **Bo góc**: `16px`
- **Khoảng cách đáy màn hình**: `16px` (Chưa tính SafeArea của thiết bị)
- **Kích thước Dock**: Rộng `288px`, Cao `122px`
  - Nút 1 ("Về truyện"): Rộng `127.00px`, Cao `44.00px`, Cắt chữ: `normal`
  - Nút 2 ("Chương trước"): Rộng `127.00px`, Cao `44.00px`, Cắt chữ: `normal`
  - Nút 3 ("Danh sách chương"): Rộng `127.00px`, Cao `44.00px`, Cắt chữ: `normal`
  - Nút 4 ("Chương sau"): Rộng `127.00px`, Cao `44.00px`, Cắt chữ: `normal`
## Kích thước 360px
- **Bố cục (Inner)**: `grid`, Cột: `147px 147px`
- **Bo góc**: `16px`
- **Khoảng cách đáy màn hình**: `16px` (Chưa tính SafeArea của thiết bị)
- **Kích thước Dock**: Rộng `328px`, Cao `122px`
  - Nút 1 ("Về truyện"): Rộng `147.00px`, Cao `44.00px`, Cắt chữ: `normal`
  - Nút 2 ("Chương trước"): Rộng `147.00px`, Cao `44.00px`, Cắt chữ: `normal`
  - Nút 3 ("Danh sách chương"): Rộng `147.00px`, Cao `44.00px`, Cắt chữ: `normal`
  - Nút 4 ("Chương sau"): Rộng `147.00px`, Cao `44.00px`, Cắt chữ: `normal`
## Kích thước 768px
- **Bố cục (Inner)**: `flex`, Cột: `none`
- **Bo góc**: `99px`
- **Khoảng cách đáy màn hình**: `20px` (Chưa tính SafeArea của thiết bị)
- **Kích thước Dock**: Rộng `628.484375px`, Cao `62px`
  - Nút 1 ("Về truyện"): Rộng `123.42px`, Cao `44.00px`, Cắt chữ: `nowrap`
  - Nút 2 ("Chương trước"): Rộng `148.17px`, Cao `44.00px`, Cắt chữ: `nowrap`
  - Nút 3 ("Danh sách chương"): Rộng `178.75px`, Cao `44.00px`, Cắt chữ: `nowrap`
  - Nút 4 ("Chương sau"): Rộng `137.14px`, Cao `44.00px`, Cắt chữ: `nowrap`
## Kích thước 1280px
- **Bố cục (Inner)**: `flex`, Cột: `none`
- **Bo góc**: `99px`
- **Khoảng cách đáy màn hình**: `20px` (Chưa tính SafeArea của thiết bị)
- **Kích thước Dock**: Rộng `628.484375px`, Cao `62px`
  - Nút 1 ("Về truyện"): Rộng `123.42px`, Cao `44.00px`, Cắt chữ: `nowrap`
  - Nút 2 ("Chương trước"): Rộng `148.17px`, Cao `44.00px`, Cắt chữ: `nowrap`
  - Nút 3 ("Danh sách chương"): Rộng `178.75px`, Cao `44.00px`, Cắt chữ: `nowrap`
  - Nút 4 ("Chương sau"): Rộng `137.14px`, Cao `44.00px`, Cắt chữ: `nowrap`

## Đánh giá Tương phản & Accessibility
- **Sáng (Light)**: Nền Dock mờ hiển thị rõ ràng, tách bạch khỏi trang truyện. Fallback nền tĩnh hiển thị đúng với các trình duyệt không hỗ trợ backdrop-filter.
- **Tối (Dark)**: Opacity `0.93` của nền Dock đã ngăn chặn hoàn toàn việc chữ bên dưới có thể lọt qua nhãn nút.
- **Không che chắn chữ**: Khoảng đệm `padding-bottom` 90px ở cuối trang đã chừa đủ khoảng trống để Dock lơ lửng, nội dung truyện (hoặc pager cuối chương) luôn khả dụng.
