# Thư Các — StoryWeb

Website đọc truyện tiếng Việt dùng Next.js 16, React 19, TypeScript, PostgreSQL và Drizzle. Trang công khai có danh mục, tìm kiếm, chi tiết truyện, trình đọc và tủ truyện lưu trong trình duyệt. `/panel` cho quản trị viên đăng nhập, soạn truyện/chương, lưu nháp, xuất bản, sửa và xóa.

## Chạy local

Cần Node.js 22.12+ và PostgreSQL. Sao chép `.env.example` thành `.env.local`, điền `DATABASE_URL`, `ADMIN_PANEL_PASSWORD` và `ADMIN_SESSION_SECRET` (ít nhất 32 ký tự). Không commit `.env.local`.

```bash
npm ci
npm run db:migrate
npm run dev
```

Trên máy Windows này, nếu PowerShell chưa tìm thấy Node/npm, thêm `C:\Program Files\nodejs` vào `PATH` của phiên shell.

Kiểm tra mã: `npm run typecheck`, `npm run lint`, `npm run build`. Route `/api/health` trả 200 khi kết nối PostgreSQL hoạt động.

Nếu có dữ liệu CMS cũ ở `content/published-stories.json`, chạy `node scripts/import-stories.mjs [đường-dẫn-file]` một lần sau migration. Script bỏ qua truyện đã tồn tại.

## Triển khai Railway

Production: [storyweb-production.up.railway.app](https://storyweb-production.up.railway.app). Panel quản trị ở `/panel`; health check ở `/api/health`.

Project cần hai service: PostgreSQL và ứng dụng Next.js kết nối repository GitHub nhánh `main`. Đặt biến của service web:

| Biến | Giá trị |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (tham chiếu service PostgreSQL) |
| `ADMIN_PANEL_PASSWORD` | Mật khẩu quản trị mạnh, chỉ lưu trong Railway |
| `ADMIN_SESSION_SECRET` | Chuỗi ngẫu nhiên ít nhất 32 ký tự |
| `CLICK_UNLOCK_SECRET` | Chuỗi ngẫu nhiên ít nhất 32 ký tự |
| `CLICK_UNLOCK_ENABLED` | `false` cho tới khi có luồng mở khóa được cho phép |
| `SHOPEE_GATE_APPROVED` | `false` cho tới khi có chấp thuận riêng |
| `NEXT_PUBLIC_SITE_URL` | Domain HTTPS của web sau khi tạo domain |

`.railway/railway.ts` quản lý nguồn GitHub, biến tham chiếu PostgreSQL, lệnh `npm run db:migrate` trước deploy và health check `/api/health`. Áp dụng thay đổi hạ tầng bằng `railway config plan` rồi `railway config apply`. Tạo domain Railway cho service web rồi kiểm tra trang chủ, `/panel` và route health. Không lưu mật khẩu, token hoặc URL database trong Git.

## Quyền đọc chương

Chương 1 miễn phí theo mặc định. Thân chương khóa chỉ được truy vấn sau khi server kiểm tra cookie mở khóa ký HMAC, thời hạn 5 phút. Khi hết hạn, lần chuyển chương tiếp theo cần mở khóa lại. Luồng click được cấu hình bằng `CLICK_UNLOCK_ENABLED`, `CLICK_UNLOCK_URL` và `CLICK_UNLOCK_SECRET`; mặc định tắt. Nó xác nhận cú click trên website, không xác nhận người đọc đã xem trang đích hoặc mua hàng.

Link Shopee trong luồng mở khóa cần chấp thuận riêng trước khi bật `SHOPEE_GATE_APPROVED=true`. Không dùng popup tự động hoặc tự chuyển hướng. Có thể tham khảo phương án quảng cáo có thưởng trong [kiến trúc](docs/ARCHITECTURE.md).

## Phối hợp agent

Quy tắc và phân công nằm tại [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), [.agents/rules/project-context.md](.agents/rules/project-context.md) và [docs/WORKBOARD.md](docs/WORKBOARD.md). Các vai trò là Codex (tích hợp), Claude Code (backend) và Antigravity (UI/UX); mỗi agent tự cập nhật bảng công việc khi nhận phần việc.
