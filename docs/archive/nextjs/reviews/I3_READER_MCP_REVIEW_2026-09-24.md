# I3 — Review trang đọc U5/M3 và công cụ MCP

## Phạm vi tích hợp

- U5 `d2300d3` đã nằm trong nhánh M3 `1ac67e8`; I3 ghép M3 một lần, giữ bản CSS sửa theo selector sau khi U5 hoàn tác lần thay chuỗi diện rộng.
- M3 thêm tùy chỉnh đọc có validate/migrate localStorage, view U5, test và hướng dẫn link unlock. Không đổi route trả body, `src/lib/unlock.ts`, schema hay migration; quyền đọc 5 phút/server guard từ I2 giữ nguyên.
- Review so `src/app/globals.css` và `dark-overrides.css`: không còn token tự tham chiếu, mã màu bị cắt hay `var(--surface)` chưa định nghĩa.

## Lỗi sửa trên I3

1. Giữ `h1` chương ở mức 34–48px thay vì thu nhỏ xuống tối đa 36px; tên truyện 16–22px và kết chương 17–20px, giảm letter spacing của tên truyện để dễ đọc tiếng Việt.
2. Nút trong panel tùy chỉnh và reset có vùng nhấn tối thiểu 44px; lựa chọn dark mode dùng chữ tối trên màu nhấn (tương phản 5.96:1), nút điều hướng disabled có trạng thái rõ. Độ đậm `Đậm` trên body là 700 đúng với nhãn, không phải 600.
3. Đóng panel tùy chỉnh hoặc danh sách chương khi chương đang khóa không làm hiệu ứng gate giành lại focus từ nút kích hoạt. Sửa hover danh sách chương trong dark mode dùng token có thật.
4. Script test link có thao tác tạo/xóa truyện và đổi admin settings; I3 chặn URL không phải localhost và bắt buộc tên DB `storyweb_test` hoặc `storyweb_m3_*` trước khi gửi request. Cập nhật hướng dẫn test. Đã thử hai trường hợp URL ngoài và DB `railway`, script đều dừng trước request.
5. Gỡ whitespace ở view U5; `git diff --check` sạch.

## Kiểm tra

- Trên nhánh tích hợp I3: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build` đều đạt sau `npm.cmd ci --offline` trong worktree riêng. Lần build đầu dừng vì worktree mới chưa có `node_modules/next`, không phải lỗi mã.
- `node --experimental-strip-types --no-warnings scripts/test-reader-preferences.mjs`: 8/8. `scripts/test-rewarded-flow.mjs` cùng flags: 9/9.
- Claude ghi đã chạy link unlock 8/8, B1 15/15, M2 14/14, migration và smoke trên DB `storyweb_m3_*` riêng (DB đã xóa), xem bàn giao M3 trên workboard. I3 không chạy lại e2e link vì máy review không có PostgreSQL test; server unlock và migration không thay đổi trong U5/M3.
- Công cụ browser của phiên Codex không liệt kê browser khả dụng; chưa có ảnh/kiểm tra trực quan 360/768/1280px và vòng thao tác bàn phím thực tế. CSS và cấu trúc JSX đã được review tĩnh; đây là giới hạn nghiệm thu UI còn lại.

## Context7 và Memory cho ba agent

- Trong phiên Codex I3, `memory.search_nodes` cho I3/U5/M3 và Context7 `resolve-library-id` + `query-docs` React đều trả kết quả. Config Codex có hai server.
- Antigravity có `context7` và `memory` trong cả hai file config người dùng; path chuẩn hiện hành là `~/.gemini/config/mcp_config.json`, cùng trỏ đến file Memory chung.
- Claude Code có `.mcp.json` project hợp lệ, gồm hai server và `${VAR:-default}` được tài liệu Claude xác nhận. CLI `claude` không có trong PATH của shell review, nên trạng thái **kết nối trong extension** cần xem `/mcp` tại đúng worktree; config file không tự chứng minh kết nối.
- `AGENTS.md`, quy tắc Antigravity, `CLAUDE.md`, `docs/MCP_TOOLS.md` và giao thức workboard yêu cầu kiểm tra server khi nhận việc, ghi Memory search/update và Context7 query (hoặc lý do không cần) khi bàn giao. Worktree mới phải xuất phát từ `main` có `.mcp.json`.

Nguồn cấu hình hiện hành: [Claude Code MCP](https://code.claude.com/docs/en/mcp), [Google Antigravity MCP](https://codelabs.developers.google.com/getting-started-google-antigravity), [OpenAI Docs MCP/Codex](https://developers.openai.com/learn/docs-mcp).
