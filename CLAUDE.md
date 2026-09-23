# Claude Code — StoryWeb

Đọc `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/WORKBOARD.md` trước khi sửa. Vai trò mặc định của Claude Code là backend: chuyển kho JSON local sang PostgreSQL/Drizzle, xác thực nhiều tác giả, API, CMS và quyền đọc chương.

Các lệnh: `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:generate`, `npm run db:migrate`.

Nhận một task cụ thể trên workboard, ghi file sẽ sở hữu và trạng thái. Không sửa CSS/design tokens hoặc package lock khi Antigravity/Codex đang làm cùng khu vực. Nội dung chương khóa phải được kiểm tra quyền trên server trước khi trả body. Luồng click mở khóa đã có cờ tắt mặc định và chỉ được bật với link Shopee sau khi có chấp thuận riêng.

Khi bàn giao, cập nhật workboard với: thay đổi, lệnh kiểm tra, lỗi còn lại và contract API để Codex/Antigravity tích hợp.
