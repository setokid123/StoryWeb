# U3 — Antigravity: rà soát và hoàn thiện Studio / trang đọc

**Người thực hiện:** Antigravity trong extension của người dùng. **Phạm vi:** UI/UX hiện có; không deploy.

## Bắt đầu

1. Mở repository StoryWeb trong Antigravity. Đọc `AGENTS.md`, `.agents/rules/project-context.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKBOARD.md`, `docs/DESIGN_SYSTEM.md`.
2. Nhận mục **U3** trong `docs/WORKBOARD.md`: ghi `Đang làm (Antigravity)` và các file dưới đây trước khi sửa. Nếu mục chưa có, thêm một dòng U3. Dùng nhánh hoặc worktree `antigravity/u3-studio-reader`; kiểm tra `git status` để không ghi đè việc chưa commit. Báo Codex nếu một file đã có chủ sở hữu đang sửa.
3. Trước khi viết mã Next.js, đọc hướng dẫn liên quan trong `node_modules/next/dist/docs/` theo `AGENTS.md`. Chạy ứng dụng local với PostgreSQL và `.env.local` riêng theo `README.md`; dùng truyện thử local, không sửa dữ liệu production.

## File được sở hữu trong U3

- `src/components/publishing-panel.tsx`: bố cục và tương tác Studio, đặc biệt chọn truyện/chương và phản hồi thao tác.
- `src/components/admin-login.tsx`: trải nghiệm đăng nhập, nhãn, lỗi và trạng thái đang xử lý.
- `src/components/reader-panel.tsx`: thanh công cụ đọc, điều hướng chương, trạng thái chương khóa và khả năng truy cập.
- `src/app/globals.css`: chỉ Antigravity sửa trong thời gian U3; phối hợp trên workboard trước khi agent khác cần sửa file này.
- `docs/DESIGN_SYSTEM.md`: ghi lại quyết định giao diện và các trạng thái mới.
- `docs/WORKBOARD.md`: chỉ cập nhật dòng nhận việc và bàn giao U3.

Không sửa `src/db/**`, `src/lib/**`, `src/app/api/**`, `src/app/unlock/**`, `src/app/doc/**`, `src/app/panel/**`, `src/data/**`, `package.json`, `package-lock.json`, migration hoặc cấu hình Railway. Nếu phát hiện vấn đề cần đổi hợp đồng dữ liệu, route hay API, mô tả cho Codex/Claude Code trên workboard rồi chờ bàn giao phạm vi file. Giữ nguyên quy tắc chương 1 miễn phí, kiểm tra quyền trên server, cookie 5 phút và cờ tắt luồng click. Không tự mở popup hoặc chuyển hướng ngoài.

## Việc cần làm

1. **Kiểm tra trực quan thực tế** tại chiều rộng 360, 768 và 1280 px: `/panel` trước/sau đăng nhập, Studio rỗng và có nhiều truyện/chương, trang đọc chương 1 và chương khóa. Ghi rõ lỗi tái hiện được: tràn ngang, chữ bị cắt, nút khó chạm, danh sách truyện/chương khó tìm, đối tượng che nội dung, tương phản/focus kém.
2. **Hoàn thiện Studio trên mobile:** giữ thư viện truyện và danh sách chương có thể tìm/chọn bằng chạm lẫn bàn phím; trạng thái truyện/chương đang chọn phải rõ; các hành động lưu nháp, xuất bản, xóa, đăng xuất và cảnh báo bản sửa chưa lưu phải dễ thấy. Xử lý empty/loading/error/success và lỗi validation ngay tại vùng cần sửa. Không làm mất nội dung đang gõ khi API thất bại hoặc khi chuyển mục.
3. **Hoàn thiện trang đọc:** thanh cỡ chữ/chế độ tối, link chương trước/sau và nút đóng trạng thái khóa dễ dùng trên màn hình nhỏ; thứ tự Tab hợp lý, focus nhìn rõ, tên truy cập cho nút biểu tượng, thông báo trạng thái có ngữ nghĩa. Kiểm tra trạng thái khóa khi gate tắt và khi cấu hình thử cục bộ, nhưng không bật gate ở production. Nội dung chương khóa không được xuất hiện trước khi có quyền.
4. **Giữ phong cách hiện tại:** tiếng Việt, sắc giấy/đất nung/xanh đậm và nhịp đọc yên tĩnh trong `docs/DESIGN_SYSTEM.md`. Chỉ đổi thiết kế ở nơi kết quả kiểm tra cho thấy cần thiết; không đổi hợp đồng props/API hoặc thêm thư viện UI nếu chưa phối hợp.

## Tiêu chí nghiệm thu

- Ở 360/768/1280 px không có cuộn ngang ngoài vùng danh sách được thiết kế cuộn; mọi nút chính vẫn thấy và bấm được, mục đang chọn không bị che.
- Có thể dùng Tab, Shift+Tab, Enter/Space để đăng nhập, tạo/chọn truyện, chọn chương, lưu và điều khiển trang đọc. Focus luôn nhìn thấy; thông báo lỗi/thành công được công bố cho công nghệ hỗ trợ và chỉ tới trường cần sửa khi phù hợp.
- Form giữ dữ liệu sau lỗi mạng/validation. Các trạng thái rỗng, đang xử lý, thành công và thất bại có lời nhắc bằng tiếng Việt cùng hành động tiếp theo rõ ràng.
- Dialog/trạng thái chương khóa có tiêu đề, hành động đóng/quay lại rõ; link ngoài chỉ hiện khi được cấu hình và ghi rõ sẽ mở tab mới. Không đổi logic cấp quyền hoặc đưa thân chương khóa xuống client.
- `npm run typecheck`, `npm run lint`, `npm run build` đạt. Nếu một lệnh không chạy được, ghi nguyên nhân và lỗi cụ thể trong bàn giao.

## Bàn giao

Gửi Codex nhánh và commit, danh sách file đã sửa, những lỗi UX đã tái hiện và cách sửa, cùng kết quả ba lệnh kiểm tra. Đính kèm ảnh chụp **trước/sau** tại 360 px và 1280 px cho Studio và trang đọc, cộng một ảnh 768 px hoặc walkthrough ngắn theo luồng bàn phím; che thông tin đăng nhập/dữ liệu riêng. Cập nhật dòng U3 trên workboard thành `Hoàn tất` và nêu phần còn thiếu. Không push `main`, không chạy migration trên DB chung và không deploy; Codex sẽ review/tích hợp.
