# I10 — Review và tích hợp U6 (2026-09-24)

Nguồn UI: `antigravity/u6-visual-hierarchy` tại `31f72cd` + bản sửa `f1e534e`. Tích hợp với các review I8/I9 trên `main`; diff ứng dụng chỉ đổi CSS, không đổi ReaderPanel, quyền đọc, API, DB, migration hoặc cấu hình deploy.

## Kết quả

- Hai lỗi chặn I9 đã hết: `.reader-article` có surface ở desktop và mobile; nhãn/input của form dark mode dùng màu theo theme. Edge CDP xác nhận article rộng 800px ở 1280px, 709px ở 768px và 328px ở 360px, có nền riêng ở cả Sáng/Tối.
- Codex sửa thêm `--muted` Sáng để nhãn form và chữ phụ đạt tương phản; đổi metadata/rating của thẻ truyện theo token; đặt chữ tối trên CTA cam trong dark mode. CSS theo `html[data-theme=dark]` giữ chữ chương và nút toolbar đọc được ngay trước khi ReaderPanel hydrate.
- Route preview tạm đã chạy **component ReaderPanel, StoryCard, header/footer thật** với dữ liệu mẫu, rồi được gỡ. Trạng thái khóa trong preview nhận `content=null`, chỉ chứng minh phần hiển thị; không thay thế kiểm thử quyền đọc trên server hoặc DB.

## Kiểm tra trình duyệt

Edge headless/CDP tại 360, 768, 1280px, cả Sáng/Tối. Reader free ở cả ba kích thước; locked ở 360 và 1280. Không tràn ngang; `.reader-text` dùng được cỡ 26px/đậm/rộng trong fixture CSS, còn preview component mặc định dùng 19px. Bốn nút điều hướng ở 360px rộng 133px và cao 44px; tại 768/1280px cũng cao 44px. Panel tùy chỉnh dark 360px nằm trong viewport (`left=0`, `right=360`), focus vào nút đóng; Escape đóng và trả focus về “Tùy chỉnh đọc”. Khi bỏ class `reader-shell--night` để mô phỏng trước hydration, CSS dark vẫn cho chữ chương `rgb(231,226,213)` và nút toolbar nền `rgb(42,58,57)`.

| Cặp chữ/nền | Tương phản |
| --- | ---: |
| Chữ phụ Sáng / nền site | 4,66:1 |
| Nhãn form Sáng / card | 5,54:1 |
| Nhãn form Tối / card | 5,59:1 |
| Chữ input Tối / nền input | 8,99:1 |
| Thân chương Tối / mặt đọc | 9,87:1 |
| CTA Sáng / nền cam | 4,54:1 |
| CTA Tối / nền cam | 5,96:1 |
| Rating card Sáng / card | 5,87:1 |
| Rating card Tối / card | 6,42:1 |

Ảnh **sau** từ route preview tạm, có nội dung mẫu và khóa giả lập bằng `content=null`:

| Theme | 360px | 1280px |
| --- | --- | --- |
| Sáng, free | [ảnh](screenshots/u6-after-light-360-free.png) | [ảnh](screenshots/u6-after-light-1280-free.png) |
| Sáng, locked | [ảnh](screenshots/u6-after-light-360-locked.png) | [ảnh](screenshots/u6-after-light-1280-locked.png) |
| Tối, free | [ảnh](screenshots/u6-after-dark-360-free.png) | [ảnh](screenshots/u6-after-dark-1280-free.png) |
| Tối, locked | [ảnh](screenshots/u6-after-dark-360-locked.png) | [ảnh](screenshots/u6-after-dark-1280-locked.png) |

Ảnh **trước** trong [I4](screenshots/reader-dark-1280.png), [Sáng mobile](screenshots/reader-light-360.png) dùng cùng lớp ReaderPanel nhưng nội dung mẫu khác. Chúng cho thấy article trước U6 nằm trực tiếp trên nền reader. 768px và panel/focus được kiểm bằng CDP, không lưu thêm ảnh.

## Gate và giới hạn

Sau khi gỡ route preview và typegen dev tạm, `npm run build`, `npm run typecheck`, `npm run lint`, `git diff --check` đạt; build không chứa route preview. Antigravity chưa tự ghi ảnh, số đo, Context7 và Memory vào workboard; Codex đã kiểm chứng và ghi tại đây. Trang chủ/chi tiết/Studio đầy đủ và production chưa được chạy lại với PostgreSQL trong I10; kiểm browser ở đây tập trung ReaderPanel, header, StoryCard và các selector U6 thay đổi. Chưa push GitHub hoặc deploy Railway.

Context7: không cần (không sửa API thư viện; route preview tạm theo tài liệu Next.js 16 local). Memory: đã tra U6/I9/gotcha:css-tokens; đã cập nhật I10/U6.
