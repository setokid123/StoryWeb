# B1 — Claude Code: tài khoản độc giả, nhiều tác giả và phân quyền CMS

## Cách nhận việc

Mở repository này trong **Claude Code extension** và giao nguyên nội dung file này cho Claude Code. Trước khi sửa, đọc `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKBOARD.md` và hướng dẫn Next.js liên quan trong `node_modules/next/dist/docs/`. Nhận mục **B1** trên workboard: đổi trạng thái thành `Đang làm (Claude Code)`, ghi nhánh và file dự kiến sửa. Tạo nhánh/worktree riêng `claude/b1-multi-user-auth` từ `origin/main`; không sửa trực tiếp `main`. Nếu worktree hiện có thay đổi chưa commit, không ghi đè; báo Codex để thống nhất điểm xuất phát.

## Hiện trạng và kết quả cần đạt

- `src/db/schema.ts` đã có `users` với role `reader | editor | admin`, nhưng chưa có credential hoặc session tài khoản. `stories` chưa gắn chủ sở hữu.
- `/panel`, `/api/admin/stories` hiện dựa vào mật khẩu `ADMIN_PANEL_PASSWORD` và cookie HMAC 7 ngày trong `src/lib/admin-auth.ts`. Đây là lối đăng nhập quản trị **đang chạy trên Railway**; phải tiếp tục hoạt động sau khi tích hợp B1.
- `src/lib/managed-stories.ts` lưu truyện trên PostgreSQL; `/api/admin/stories` hiện trả toàn bộ bản nháp và cho phép sửa/xóa tất cả khi có cookie quản trị.
- Thêm tài khoản độc giả và tác giả, session an toàn, quyền editor/admin trên server, giới hạn thử đăng nhập. API và model phải cho phép UI agent làm form đăng nhập/đăng ký và màn hình quản lý tài khoản sau đó. B1 tập trung backend; giao rõ API contract cho Codex/Antigravity.

## Phạm vi và file sở hữu

Claude Code sở hữu trong nhánh B1:

- `src/db/schema.ts`, migration **mới** trong `drizzle/` và metadata Drizzle tương ứng: credential/session, owner truyện, dữ liệu giới hạn đăng nhập nếu dùng DB.
- Module auth **mới** trong `src/lib/` và route **mới** trong `src/app/api/auth/` cho đăng ký độc giả, đăng nhập, đăng xuất, xem session; route quản trị tài khoản/tác giả nếu cần.
- `src/app/api/admin/stories/route.ts`, `src/lib/managed-stories.ts`, `src/app/panel/page.tsx`: chỉ phần kiểm tra role, lọc quyền sở hữu và cập nhật truyện; giữ contract dữ liệu hiện tại cho `PublishingPanel` nếu có thể.
- `src/lib/admin-auth.ts`, `src/app/api/admin/login/route.ts`, `src/app/api/admin/logout/route.ts`: chỉ khi cần adapter tương thích; không xóa đường đăng nhập quản trị hiện tại.
- Test backend mới và tài liệu API/hướng dẫn tạo tài khoản editor, nếu cần.

Không sửa `src/app/globals.css`, `src/components/**`, `src/data/stories.ts`, luồng `src/lib/click-unlock.ts`, `src/app/doc/**`, Railway config, deployment hoặc secret production. Không sửa `package.json`/lockfile nếu chưa ghi quyền sở hữu tạm thời trên workboard và báo Codex; nếu cần dependency mới, giải thích lựa chọn trước khi sửa. Không chạy migration trên Railway production và không push/deploy nhánh này trực tiếp.

## Yêu cầu triển khai

1. **Migration tương thích:** không xóa dữ liệu `users`, `stories`, `chapters` hiện tại. Gắn chủ sở hữu truyện bằng cột nullable hoặc phương án tương đương; truyện cũ vẫn do admin quản lý và editor mới không được tự nhận. Migration phải chạy được trên DB đã có hai migration `0000` và `0001`.
2. **Credential/session:** chuẩn hóa email, lưu mật khẩu bằng thuật toán băm mật khẩu có salt và chi phí thích hợp; không lưu plaintext hoặc log mật khẩu/token. Session gắn user ID/role, có hạn dùng, cookie `HttpOnly`, `Secure` ở production và `SameSite` phù hợp; logout vô hiệu hóa session trên server. Role hiện tại phải đọc từ DB hoặc được thu hồi hiệu quả khi đổi quyền, không chỉ tin role cũ trong cookie.
3. **Tạo tài khoản:** đăng ký công khai chỉ tạo `reader`; không cho client tự đặt role. Tạo/nâng quyền `editor`/`admin` chỉ qua đường được admin bảo vệ hoặc lệnh quản trị có chủ đích. Ghi rõ cách tạo editor đầu tiên mà không nhúng credential vào Git.
4. **Phân quyền CMS:** admin cũ và admin theo tài khoản xem/sửa/xóa toàn bộ truyện; editor chỉ xem/sửa/xóa truyện mình sở hữu và khi tạo mới server tự gắn owner từ session. Không tin `ownerId`, role hoặc author name từ request để quyết định quyền. Reader/anonymous không truy cập CMS. Trả `401` khi chưa xác thực, `403` khi thiếu quyền; không lộ bản nháp hoặc nội dung chương của tác giả khác.
5. **Giới hạn đăng nhập:** giới hạn số lần thất bại trên nhiều instance bằng kho dùng chung (PostgreSQL hoặc dịch vụ đã thống nhất), có cửa sổ thời gian và thông báo/HTTP status rõ. Không dùng bộ đếm in-memory. Xử lý input quá dài, email sai định dạng, mật khẩu sai bằng phản hồi không tiết lộ tài khoản có tồn tại hay không; kiểm tra nguồn cho request đổi trạng thái nếu thiết kế session-cookie cần.
6. **Tương thích production:** `POST /api/admin/login` với `{ password }`, `POST /api/admin/logout`, `/panel` và `/api/admin/stories` với cookie quản trị cũ vẫn hoạt động. Không đổi ý nghĩa `ADMIN_PANEL_PASSWORD` hay `ADMIN_SESSION_SECRET`; không in giá trị hai biến này. `CLICK_UNLOCK_ENABLED=false` và quy tắc chương 1 miễn phí giữ nguyên. Không chuyển quyền đọc chương sang session mới trong B1.

## Tiêu chí nghiệm thu

- Migration chạy trên bản sao/local DB có dữ liệu truyện cũ mà không mất truyện/chương; admin cũ vẫn đăng nhập và quản lý được truyện cũ.
- Reader đăng ký/đăng nhập/đăng xuất được; session hết hạn hoặc đã logout bị từ chối. Reader không gọi được API CMS.
- Hai editor có truyện riêng; editor A không thấy, sửa hoặc xóa được bản nháp của B kể cả gửi ID trực tiếp. Admin thấy và quản lý được cả hai. Client không thể tự nâng role hoặc đổi owner.
- Thử sai mật khẩu liên tiếp vượt ngưỡng bị giới hạn ngay cả khi request đi qua hai instance/kết nối khác nhau. Không lộ mật khẩu/hash/token trong response/log.
- API trả lỗi có cấu trúc và mã `400/401/403/429` phù hợp; ghi rõ request/response JSON của các route mới để UI agent tích hợp. Không thay đổi contract `stories` cũ mà không ghi phương án tương thích.
- Các trang public và chương khóa vẫn build; thân chương khóa không xuất hiện trong HTML/JSON chưa được phép.

## Kiểm tra và bàn giao

Chạy trên DB **local hoặc DB test riêng**, không dùng Railway production:

```bash
npm ci
npm run db:migrate
npm run typecheck
npm run lint
npm run build
```

Thêm và chạy kiểm thử backend có ý nghĩa cho ma trận role/owner, session, giới hạn đăng nhập và tương thích admin cũ; ghi lệnh chạy cụ thể. Với Windows PowerShell nếu thiếu `npm` trong PATH, thêm `C:\Program Files\nodejs` vào PATH của phiên shell. Khi xong, commit trên `claude/b1-multi-user-auth`, cập nhật mục B1 trên `docs/WORKBOARD.md`, rồi bàn giao cho Codex: commit/PR, file đã đổi, migration và rollback plan, API contract, lệnh/kết quả kiểm tra, lỗi còn lại, yêu cầu env mới và công việc UI cần Antigravity thực hiện. **Codex review/tích hợp và quyết định deploy; Claude Code không deploy.**
