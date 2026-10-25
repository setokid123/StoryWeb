# Kế hoạch U4/M2 — nút đọc, vị trí quảng cáo và hai cách mở khóa

## Quyết định sản phẩm

Chương 1 vẫn miễn phí. Với chương khóa, quyền đọc hiện có thời hạn **5 phút**; yêu cầu mới đổi **cách nhận quyền** chứ chưa đổi thời hạn. Admin bật/tắt luồng mở khóa và chọn đúng **một** trong hai phương thức: **Nhấp liên kết** hoặc **Xem quảng cáo có thưởng**. Phương thức đang bật là phương thức duy nhất người đọc thấy. Nếu chưa đủ điều kiện cấu hình, ứng dụng giữ trạng thái tắt và giải thích lý do trong Studio.

Các khối quảng cáo hiển thị thông thường là một tính năng riêng; nhìn thấy hoặc nhấp vào khối đó không cấp quyền đọc. Không tự mở popup, không tự chuyển trang, không cấp quyền khi quảng cáo lỗi, không có quảng cáo hoặc người dùng đóng trước khi được xác nhận hoàn thành.

## Thanh điều hướng chương

Ảnh người dùng gửi có bốn nút cùng hàng nhưng bốn màu và kích thước không đồng nhất. Thiết kế lại thành một nhóm nhất quán với bốn thao tác:

| Nút | Hành vi | Cấp thị giác |
| --- | --- | --- |
| Về truyện | Về trang chi tiết truyện | Phụ |
| Chương trước | Về chương liền trước; vô hiệu ở chương đầu | Viền |
| Danh sách chương | Mở danh sách chương trong panel/drawer có thể đóng bằng Escape | Viền |
| Chương sau | Sang chương liền sau; vô hiệu ở chương cuối | Chính |

Dùng cùng font, chiều cao tối thiểu 44 px, icon và khoảng cách nhất quán. Ở 360 px xếp hai hàng hoặc lưới 2 cột, không tràn ngang hay che nội dung. Hai theme phải có hover/focus/disabled rõ. `Về truyện` và `Danh sách chương` không được trỏ tới cùng một trang: danh sách là panel thực sự, có focus trap, nhãn và trạng thái chương hiện tại. Không đặt quảng cáo sát nhóm nút để tránh nhấp nhầm.

## Các khối quảng cáo hiển thị

Tạo một registry slot và component view dùng lại. Mỗi slot có nhãn **Quảng cáo**, kích thước dự trữ để tránh xô lệch khi tải, trạng thái rỗng/no-fill, và hỗ trợ Sáng/Tối:

| ID | Vị trí | Ghi chú |
| --- | --- | --- |
| `home_feed` | Sau cụm truyện nổi bật, trước cập nhật | Không chen giữa card truyện |
| `story_detail` | Trước danh sách chương | Giữ khoảng cách với nút đọc |
| `reader_end` | Sau nội dung chương, trước điều hướng | Chỉ hiện khi chương đã được phép đọc; không chen vào đoạn văn |
| `search_results` | Sau bộ lọc, trước kết quả | Chỉ khi có nội dung quảng cáo thực |

Slot tắt hoặc không có quảng cáo thì ẩn hoàn toàn trên trang công khai; bản xem trước Studio được phép hiển thị khung mẫu có nhãn rõ. Không cho admin nhập HTML/script tùy ý. Dữ liệu placement và mã đơn vị quảng cáo được kiểm tra theo nhà cung cấp đã chọn, không trộn với phương thức mở khóa.

## Cấu hình Studio và hợp đồng giữa hai agent

Tạo mục **Quảng cáo & mở khóa** chỉ admin truy cập, ví dụ `/panel/cai-dat`. Editor được phép đăng truyện nhưng không xem hoặc sửa cài đặt quảng cáo. Trang có:

1. Công tắc **Bật mở khóa chương**; mặc định tắt và giữ một cơ chế tắt khẩn cấp bằng env.
2. Hai radio card **Nhấp liên kết** và **Xem quảng cáo có thưởng**, kèm trạng thái `Sẵn sàng` / `Chưa cấu hình` và giải thích. Đổi lựa chọn chưa áp dụng cho tới khi admin lưu thành công.
3. Tóm tắt: chương 1 miễn phí, mỗi lượt mở khóa cho đọc 5 phút, thời điểm hết hạn. Không hứa rằng nhấp liên kết chứng minh đã xem trang đích hoặc mua hàng.
4. Nhóm slot quảng cáo thông thường với bật/tắt từng vị trí, preview, loading/error/success. Cấu hình slot không tự bật chế độ thưởng.

Claude Code sở hữu dữ liệu, API, quyền admin, state phía client, lưu/đọc setting, kiểm tra readiness, tích hợp nhà cung cấp và điều kiện mở chương. Antigravity sở hữu view, CSS, bố cục responsive, nhãn tiếng Việt, focus/keyboard; các view nhận dữ liệu và callback qua props có type. Hai bên **không sửa đồng thời** `reader-panel.tsx`, `publishing-panel.tsx`, `src/app/globals.css` hoặc `src/db/schema.ts`. Claude giữ container `reader-panel.tsx` và route/page; Antigravity tạo component view riêng để Claude ghép sau khi U4 bàn giao. Contract props phải được ghi rõ khi có thay đổi.

## Quyền đọc và điều kiện bật

- Server lưu `enabled`, `mode` (`link` hoặc `rewarded`), `revision` và trạng thái slot trong PostgreSQL bằng migration mới; chỉ `getAdminAccess()` được đọc phần cấu hình riêng/sửa. API cập nhật kiểm tra Origin/CSRF, dữ liệu đầu vào và quyền admin. Secret/token ở env, không trả về client.
- Cookie/quyền 5 phút gắn với `revision`. Tắt hoặc đổi mode làm quyền cấp theo cấu hình cũ hết hiệu lực ngay. Mọi đường trả body chương đều kiểm quyền trên server; giữ nguyên bảo vệ chương 1 và bản nháp.
- Link: chỉ thao tác rõ ràng của người đọc mới mở trang đích. Luồng hiện tại chỉ xác nhận lượt truy cập link trên StoryWeb. `SHOPEE_GATE_APPROVED` là chặn cứng phía server; admin switch không thể vượt qua. Trước khi bật link Shopee cần chấp thuận riêng như đã ghi ở `docs/ARCHITECTURE.md`.
- Rewarded: chỉ cấp quyền nếu nhà cung cấp **web** có bằng chứng hoàn thành mà server kiểm được, kèm chống phát lại và gắn đúng lượt người đọc. Chưa chọn/kết nối được nhà cung cấp thì radio card hiện `Chưa cấu hình`, lưu mode rewarded đang bật bị từ chối. Có thể dùng provider mock trong dev/test nhưng tuyệt đối không cấp quyền production qua mock hoặc một request client tự xưng “đã xem xong”.
- Google Ad Manager rewarded web có sự kiện `rewardedSlotGranted` trong trình duyệt, nhưng tài liệu của Google nói xác minh server chỉ có cho app, không có cho web. Vì vậy không dùng sự kiện đó làm bằng chứng duy nhất để cấp cookie HMAC của StoryWeb. Google Offerwall tự quản entitlement của nó; chưa có bằng chứng trong tài liệu hiện tại để ánh xạ thẳng sang quyền đọc server của StoryWeb. Đây là suy luận từ [tài liệu rewarded web](https://support.google.com/admanager/answer/9116812?hl=en) và [Offerwall](https://support.google.com/admanager/answer/12726063?hl=en).
- [Điều khoản Shopee Affiliate](https://help.shopee.vn/portal/10/article/122944) yêu cầu click tự nguyện/có ý thức và cấm pop-up, pop-under, tự chuyển hướng. Cần kiểm tra lại điều khoản và chấp thuận riêng trước khi bật luồng Shopee.

## Thứ tự bàn giao

1. **U4 / Antigravity:** thiết kế và code các view độc lập: thanh nút + danh sách chương, khối quảng cáo, dialog khóa theo hai mode, trang cài đặt admin. Có ảnh 360/768/1280 px ở Sáng/Tối và trạng thái không có quảng cáo.
2. **M2 / Claude Code:** song song xây migration, settings/API, state và quyền đọc. Sau khi U4 commit, Claude ghép view vào container/routes của mình và chạy kiểm thử ma trận mode/quyền/hết hạn. Nếu provider thưởng chưa được chọn, hoàn thiện adapter và giữ mode đó chưa bật được.
3. **I2 / Codex:** review cả hai nhánh, xác nhận không lộ body chương khóa, kiểm tra build/UI, tích hợp `main`, sau đó mới deploy.

Không gọi phần thưởng là production-ready khi chưa có provider web xác minh được và kiểm thử end-to-end với tài khoản thật của nhà cung cấp.
