# Claude Code — StoryWeb

Đọc `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ADS_UNLOCK_PLAN.md`, `docs/WORKBOARD.md` trước khi sửa. PostgreSQL/Drizzle và CMS hiện đã hoạt động. B1 là việc đã hoàn tất; việc hiện tại là M2 trong `docs/assignments/CLAUDE_M2.md`.

Các lệnh: `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:generate`, `npm run db:migrate`.

Claude Code chịu trách nhiệm code **toàn bộ logic dự án**, cả client state và server: dữ liệu, xác thực, API, validation, CMS, quyền đọc, cài đặt admin và tích hợp quảng cáo. Antigravity thiết kế/code view và CSS; Claude nhận view qua typed props rồi ghép vào container/routes. Nhận task trên workboard, ghi file sẽ sở hữu và trạng thái. Không sửa CSS/design tokens hoặc package lock khi Antigravity/Codex đang làm cùng khu vực. Nội dung chương khóa phải được kiểm tra quyền trên server trước khi trả body. Luồng click vẫn tắt mặc định và link Shopee chỉ được bật sau chấp thuận riêng. Quảng cáo có thưởng chưa có provider xác minh web thì không được cấp quyền production.

Dùng MCP Context7 và Memory theo `docs/MCP_TOOLS.md` (server khai báo trong `.mcp.json`): tra Memory khi nhận việc, tra Context7 trước khi code API thư viện, ghi Memory khi bàn giao.

Khi bàn giao, cập nhật workboard với: thay đổi, lệnh kiểm tra, lỗi còn lại, contract API/props và env để Codex/Antigravity tích hợp.
