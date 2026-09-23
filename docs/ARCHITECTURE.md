# Kiến trúc StoryWeb

## Trạng thái hiện tại

Next.js App Router + React + TypeScript, CSS thuần, icon Lucide. Truyện mẫu ở `src/data/stories.ts`; panel `/panel` tạo bản nháp, thêm chương và xuất bản vào PostgreSQL qua Drizzle. Truyện xuất bản xuất hiện ở trang chủ/tìm kiếm/chi tiết/đọc. Tủ truyện và cài đặt đọc ở LocalStorage. Thân chương chỉ được truy vấn sau khi server kiểm tra quyền. Backend có session tài khoản reader/editor/admin và giới hạn quyền tác giả theo `stories.owner_id`; mật khẩu admin cũ còn dùng trong thời gian chuyển tiếp. UI tài khoản mới chưa triển khai. Railway dùng migration trước deploy và health check kiểm tra PostgreSQL.

## Vì sao stack này

- Next.js render trang truyện/chi tiết ở server, thuận lợi cho SEO và tốc độ trang nội dung; route handlers có thể phục vụ API sau này.
- TypeScript strict và Drizzle/PostgreSQL giữ hợp đồng dữ liệu rõ giữa UI, API và DB.
- CSS thuần với biến thiết kế tránh tải thêm runtime styling cho trang đọc nhiều chữ.
- Bìa CSS là placeholder; khi có ảnh thật, dùng ảnh tối ưu và kích thước cố định để tránh layout shift.

## Luồng dữ liệu production

`Browser → Next.js page/server action/route handler → auth & authorization → service → PostgreSQL`. Server component truy vấn DB trực tiếp; route handler chỉ cho request từ client hoặc webhook. Không gọi route handler nội bộ từ server component.

Với chương khóa: chỉ trả body khi chương miễn phí hoặc cookie mở khóa ký HMAC còn hạn. Mặc định chương 1 miễn phí. Cookie có hạn 300 giây và có hiệu lực trên các chương mới trong khoảng đó; hết hạn phải mở liên kết lại. Đây là cơ chế local/prototype, chưa gắn tài khoản hoặc xác nhận từ Shopee. Bản production cần entitlement trong DB theo user và kiểm tra quyền ở mọi đường đọc.

## Affiliate và mở khóa

Luồng click mở khóa được cài sẵn ở `/unlock/visit`, nhưng mặc định tắt. Khi được cấu hình, lượt nhấp chủ động vào nút mở tab mới sẽ nhận cookie ký HMAC 5 phút rồi chuyển đến URL trong môi trường. Nó xác minh **lượt nhấp lên link trên website**, không xác minh người đọc đã xem trang đích hay mua hàng. Link Shopee còn yêu cầu `SHOPEE_GATE_APPROVED=true` sau khi có chấp thuận riêng. Điều khoản Shopee Affiliate cập nhật 08/07/2026 cấm popup/pop-under và tự chuyển hướng: https://help.shopee.vn/portal/10/article/122944 . Hoa hồng theo đơn thành công, không theo click: https://help.shopee.vn/portal/10/article/123035 .

M2/U4 đã thêm cấu hình admin bật/tắt và chọn một trong hai phương thức mở khóa: nhấp liên kết hoặc xem quảng cáo có thưởng. Quyền đọc hết hạn sau 5 phút; các block quảng cáo hiển thị độc lập với quyền mở chương. Production hiện giữ luồng link tắt và rewarded chưa có provider web xác minh được. Xem [contract hiện hành](UNLOCK_API.md) và [kế hoạch U5/M3](READER_U5_M3_PLAN.md) cho đợt hoàn thiện trang đọc/test.

Để mở khóa bằng quảng cáo, cần nhà cung cấp quảng cáo có thưởng cho **web** và bằng chứng hoàn thành mà server xác minh được trước khi cấp quyền đọc. [Google Ad Manager rewarded web](https://support.google.com/admanager/answer/9116812?hl=en) có sự kiện thưởng phía trình duyệt nhưng nói rõ xác minh server chỉ có cho app, không có cho web. [Google Offerwall](https://support.google.com/admanager/answer/12726063?hl=en) tự quản quyền truy cập của Offerwall; không giả định quyền đó tự ánh xạ sang cookie mở chương của StoryWeb. Nếu chưa có provider phù hợp, mode rewarded vẫn tắt trong production.

## Việc tiếp theo

1. Thêm UI đăng nhập/đăng ký, quản lý tài khoản và chuyển tủ truyện/tiến độ đọc từ LocalStorage sang tài khoản.
2. Phân trang chương và tìm kiếm có index khi kho truyện tăng.
3. Hoàn thiện U5/M3: trang đọc, tùy chỉnh chữ và kiểm thử luồng mở khóa trên môi trường riêng. Chỉ bật quảng cáo có thưởng sau khi có provider xác minh web và kiểm thử end-to-end.
