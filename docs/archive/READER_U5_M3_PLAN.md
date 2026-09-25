# Kế hoạch U5/M3 — hoàn thiện trang đọc và thử mở khóa

## Vấn đề cần sửa

Trong ảnh người dùng gửi, tên **truyện** phía trên tiêu đề chương là nhãn 10px, dòng “Hết chương” 13px. Bốn nút cuối chương lệch thành hai nhóm: “Về truyện” đứng bên trái, ba nút còn lại đứng bên phải và dùng ba kiểu khác nhau. Thanh công cụ mới có tăng/giảm cỡ chữ và đổi Sáng/Tối.

## Kết quả mong muốn

1. **Phân cấp chữ:** tên truyện có vai trò rõ hơn nhãn chương, khoảng 18–22px desktop và 16–18px mobile; tiêu đề chương vẫn là `h1` nổi bật và không vỡ khi dài. Dòng “Hết chương N” khoảng 17–20px, đủ khoảng thở trước quảng cáo/điều hướng. Dùng phông có bộ dấu tiếng Việt đang khai báo trong design system.
2. **Điều hướng cuối chương:** bốn thao tác “Về truyện”, “Chương trước”, “Danh sách chương”, “Chương sau” ở **một nhóm căn giữa**, cùng chiều cao, viền/nền, bán kính, kiểu chữ và kích thước icon. Thứ tự giữ như trên; khác biệt chỉ ở trạng thái hover/focus/disabled/current. Desktop một hàng cân đối; mobile lưới 2×2 với nhãn đầy đủ nếu đủ chỗ, không tách nút “Về truyện” và không tràn ở 360px. Mục đầu/cuối truyện bị vô hiệu thật; “Danh sách chương” vẫn mở drawer.
3. **Tùy chỉnh đọc:** trong một panel gọn ở toolbar: họ chữ (`Lora` / `Inter`), độ đậm (`Thường` / `Đậm`), cỡ 16–26px, giãn dòng (mức dễ đọc), độ rộng cột (hẹp/vừa/rộng), căn trái/căn đều, Sáng/Tối, và “Khôi phục mặc định”. Có nhãn rõ, `aria-pressed`/radio phù hợp, thao tác bàn phím, xem thay đổi tức thì, lưu trên thiết bị. Không để toolbar chiếm nhiều hàng trên mobile. Giữ giá trị `storyweb:font-size` hiện tại khi nâng cấp tùy chọn; dữ liệu localStorage sai phải về mặc định an toàn. Chỉ áp dụng tùy chỉnh cho **body chương**, không làm hỏng chữ UI, dialog khóa hay quảng cáo.
4. **Đọc thoải mái:** dòng không quá rộng trên màn hình lớn; không bị co vào quá hẹp ở mobile. Khoảng cách đoạn và chữ cần nhất quán ở hai theme. Khi tăng chữ/đậm nhất vẫn không tràn, kể cả tiêu đề dài và dấu tiếng Việt.
5. **Mở khóa để thử:** dùng luồng link hiện có trên **môi trường test tách production** với `https://example.com/` và DB/cấu hình riêng. Chương 1 miễn phí; chương 2 khóa trước khi bấm; sau thao tác chủ động nhận grant 5 phút; sang chương mới trong hạn vẫn đọc được; hết hạn lại khóa và body biến khỏi DOM. Mở tab đích bằng nút rõ ràng, không tự popup/redirect. Không bật link Shopee khi chưa có chấp thuận riêng, không giả lập callback quảng cáo có thưởng trên production. Admin có thể đổi hai mode nhưng rewarded chưa có provider được xác minh thì tiếp tục `Chưa cấu hình`.

## Ranh giới và thứ tự

| Đợt | Agent | Việc | Bàn giao |
| --- | --- | --- | --- |
| U5 | Antigravity | Thiết kế + code view/CSS, responsive, Sáng/Tối, a11y. | Component view nhận props/callback, ảnh hoặc walkthrough 360/768/1280px. |
| M3 | Claude Code | Mọi logic client/server của preferences và test unlock, tích hợp view sau U5. | Kiểm thử persistence, grant/hết hạn/DOM, hướng dẫn test, commit. |
| I3 | Codex | Review, tích hợp, chạy gates, thử trên môi trường tách biệt. | Báo cáo và bản chạy test. Production chỉ đổi sau review và khi có cấu hình hợp lệ. |

Antigravity **không** sửa state, localStorage, API, auth hoặc entitlement. Claude **không** tự thiết kế lại CSS/view của U5. Hai agent xuất phát từ cùng commit kế hoạch trên nhánh/worktree riêng. Nếu contract props thay đổi, ghi vào workboard và chuyển cho nhau trước khi sửa file cùng sở hữu.

## Kiểm tra nghiệm thu

- So ảnh trước/sau ở 360, 768, 1280px, cả Sáng/Tối; thử chương tiêu đề dài, chương đầu/cuối và nội dung dài.
- Kiểm tra bàn phím: mở/đóng panel tùy chỉnh và drawer, focus hiện rõ, Escape và trả focus đúng, nút disabled không nhận Tab.
- Preference lưu qua refresh/chuyển chương, reset hoạt động; đổi font/đậm không tạo layout shift lớn hoặc lỗi dấu tiếng Việt.
- Trong test unlock: kiểm tra HTML và RSC của chương khóa **không chứa body**; sau 5 phút body bị gỡ khỏi DOM và server từ chối khi chưa có grant mới. Không cache/prefetch nội dung khóa.
- `npm run typecheck`, `npm run lint`, `npm run build`; Claude chạy thêm test unlock hiện có và kịch bản test mới. Codex kiểm tra lại sau merge.

## Cấu hình test dự kiến

Môi trường test dùng Postgres riêng, chạy cùng migration hiện hành, `CLICK_UNLOCK_ENABLED=true`, `CLICK_UNLOCK_SECRET` đủ 32 ký tự, `SHOPEE_GATE_APPROVED=false`, `CLICK_UNLOCK_URL=https://example.com/`. Admin tại `/panel/cai-dat` chọn `Nhấp liên kết` và bật mở khóa. Không chép secret vào git. Nếu chưa có staging Railway, Claude chuẩn bị quy trình local tái lập; Codex tạo môi trường thử sau review, không đụng production.
