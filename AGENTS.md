# StoryWeb — quy ước chung cho coding agents

Đọc `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKBOARD.md` trước khi nhận việc. Đây là cùng một repository được dùng bởi Codex, Claude Code và Antigravity.

## Phân vai mặc định

- **Codex:** kiến trúc, chốt contract giữa agent, review bảo mật, tích hợp, kiểm tra build và deploy.
- **Claude Code:** code **toàn bộ logic dự án**, gồm state phía client, server, PostgreSQL/Drizzle, xác thực, API, CMS, quyền đọc và tích hợp dịch vụ/quảng cáo.
- **Antigravity:** thiết kế và code **giao diện**: component trình bày, bố cục, CSS, responsive, accessibility và design system. Nhận dữ liệu/callback từ lớp logic; không tự quyết định quyền truy cập hoặc trạng thái hoàn thành quảng cáo.

Phân vai là mặc định để tránh sửa đè. Người dùng có thể giao việc khác. Mỗi agent cần nhận một mục trên `docs/WORKBOARD.md` trước khi sửa. Nếu phải sửa file thuộc phạm vi agent khác, ghi chú vào board và bàn giao thay đổi trước.

## Quy tắc làm việc

1. Giữ `main` luôn build được. Sau commit đầu tiên, mỗi agent dùng một nhánh/worktree riêng: `codex/*`, `claude/*`, `antigravity/*`.
2. Không chạy đồng thời `npm install` hoặc sửa `package.json`, `package-lock.json`, `src/db/schema.ts`, `src/app/globals.css` từ nhiều agent. Ghi chủ sở hữu tạm thời trên workboard.
3. Không xóa hoặc ghi đè thay đổi chưa commit của agent khác. Bàn giao bằng commit/PR hoặc ghi rõ file đã sửa và kiểm tra đã chạy.
4. Trước khi bàn giao: chạy `npm run typecheck`, `npm run lint`, `npm run build`; nếu không chạy được, ghi lý do và lỗi cụ thể.
5. UI phải hỗ trợ màn hình nhỏ, điều hướng bàn phím, trạng thái loading/empty/error khi có dữ liệu thật. Giữ giao diện tiếng Việt.
6. Không gửi nội dung chương khóa xuống client nếu chưa xác thực quyền đọc trên server. Chương 1 miễn phí mặc định; các chương sau dùng cookie ký tên, hết hạn sau 5 phút ở bản dựng hiện tại. Kế hoạch hai phương thức mở khóa nằm trong `docs/ADS_UNLOCK_PLAN.md`.
7. Luồng click mở khóa nằm sau cờ cấu hình và mặc định tắt. Chỉ cấu hình link Shopee sau khi người dùng cung cấp chấp thuận riêng; không tự mở popup hoặc tự chuyển hướng. Quảng cáo có thưởng chỉ cấp quyền sau bằng chứng mà server xác minh được; callback trình duyệt đơn thuần không đủ. Xem `docs/ARCHITECTURE.md`.

## Công cụ MCP dùng chung (bắt buộc)

Cả ba agent dùng **Context7** và **Memory** theo `docs/MCP_TOOLS.md`:

- **Context7:** tra tài liệu đúng phiên bản trong `package.json` trước khi code API thư viện. Với Next.js, `node_modules/next/dist/docs/` được ưu tiên hơn.
- **Memory:** `search_nodes` theo ID task/khu vực khi nhận việc; khi bàn giao ghi quyết định, bẫy kỹ thuật, contract và việc dở theo quy ước tên, rồi thêm dòng `Memory: đã cập nhật <entity>` vào ô bàn giao trên workboard. Không ghi secret, `DATABASE_URL`, cookie, dữ liệu người đọc hay nội dung chương.
- Repo là nguồn sự thật; nếu Memory mâu thuẫn với repo thì làm theo repo và sửa Memory. Nếu tool không chạy được, tiếp tục làm việc và ghi rõ trong bàn giao.

## Cấu trúc

- `src/app`: routes và page server components.
- `src/components`: thành phần giao diện dùng lại.
- `src/data/stories.ts`: dữ liệu mẫu.
- `src/lib/managed-stories.ts`: truy cập truyện/chương CMS trong PostgreSQL.
- `src/db`: schema, migration và kết nối PostgreSQL đang dùng bởi ứng dụng.
- `docs`: quyết định kiến trúc, thiết kế và bảng việc.

Ưu tiên thay đổi nhỏ, có mô tả rõ file và hành vi. Không tự tuyên bố tính năng production khi mới là bản demo.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
