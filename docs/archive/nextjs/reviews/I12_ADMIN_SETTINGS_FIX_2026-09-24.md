# I12 — Sửa trang Quảng cáo & mở khóa (2026-09-24)

## Nguyên nhân và thay đổi

- View cũ chỉ cho bấm **Lưu thay đổi** khi phương thức được chọn báo “sẵn sàng”. Production có `CLICK_UNLOCK_ENABLED=false`, nên bấm thử bật link khiến không lưu được cả URL và vị trí quảng cáo; trạng thái giả “sẵn sàng” khi master tắt còn che nguyên nhân thật.
- View mới đặt URL trong thẻ **Nhấp liên kết**, thêm **Điền link thử** (`https://example.com/`), cho chọn phương thức và lưu link/slot khi master tắt. Nút Lưu dựa vào thay đổi chưa lưu và trạng thái request; server vẫn kiểm tra URL, quyền admin và readiness trước khi bật mode. Lỗi `409 mode_not_ready` hướng dẫn tắt master để lưu cấu hình trước.
- Hero phân biệt mode **đang áp dụng** với bản nháp, thẻ quảng cáo nêu rõ thiếu provider/mã slot. Giao diện dùng surface và token Sáng/Tối, bố cục hai cột desktop/xếp dọc mobile, switch có vùng nhấn 44px. `src/components/unlock-settings-container.tsx` giữ logic; `unlock-settings-view.tsx` chỉ trình bày props/callback.
- `.railway/railway.ts` đổi `CLICK_UNLOCK_ENABLED` từ literal `false` sang `preserve()`: backend vẫn mặc định tắt khi biến vắng; Railway giữ giá trị do chủ dự án đặt. [Tài liệu Railway IaC](https://github.com/railwayapp/docs/blob/main/content/docs/infrastructure-as-code/reference.md) xác nhận `preserve()` giữ giá trị đang có. `railway config plan` bằng CLI 5.62.1 báo cấu hình hiện tại không có diff.

## Kiểm tra

- `npm run build`, `npm run typecheck`, `npm run lint`, `git diff --check` đạt; route preview tạm đã gỡ, build cuối không chứa route này.
- Chrome headless/CDP với component thật và dữ liệu settings mô phỏng: [Sáng 1280px](screenshots/i12-settings-light-1280.png), [Tối 360px](screenshots/i12-settings-dark-360.png). Ở 360px `innerWidth=scrollWidth=360`; bấm **Điền link thử** làm ô URL thành `https://example.com/` và bật nút Lưu, master vẫn tắt. Ảnh là preview local, không phải dữ liệu production.
- PostgreSQL Railway trên database riêng `storyweb_i12_*`: áp dụng migration; đăng nhập admin; `PUT /api/admin/settings` với master tắt lưu link `example.com` và slot trang chủ, GET mới vẫn thấy dữ liệu; bật master trong khi `CLICK_UNLOCK_ENABLED=false` trả `409 mode_not_ready`. Database test đã xóa.
- Push app commit `02869ae` lên GitHub main; Railway deployment `d84c9354-d9f3-4c30-9098-4c3759059f9b` `SUCCESS`, pre-deploy migration thành công và `next start` Ready. Sau deploy, đăng nhập bằng credential môi trường (không in giá trị): `/panel/cai-dat` và `/api/admin/settings` đều HTTP 200; trang có UI I12. Production vẫn `effectiveMode=off`, link readiness `blocked`, chưa có URL đã lưu.

## Trạng thái còn lại

- Bộ xét duyệt tự động từ chối thao tác bật `CLICK_UNLOCK_ENABLED=true` trên toàn Railway production vì người dùng chưa ủy quyền cụ thể thay đổi cấu hình lâu dài. Đã hỏi xác nhận; cờ và master production vẫn tắt. Không lách qua API hay thay cờ gián tiếp. URL mẫu hiện có thể nhập/lưu trên giao diện, nhưng mở khóa thực chỉ chạy sau khi cờ được chủ dự án cho phép và admin bật master.
- Shopee vẫn bị `SHOPEE_GATE_APPROVED=false`; rewarded/display ads chưa có provider thật. Bật vị trí quảng cáo lưu được nhưng chưa tạo impression nếu chưa cấu hình nhà cung cấp và mã slot.

Context7: Railway IaC `preserve()` (docs hiện hành); Next.js 16 local docs về Client Component và Route Handler. Memory: đã tra `unlock-settings`/`M2`; đã cập nhật `I12`.
