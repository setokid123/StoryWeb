# MCP dùng chung: Context7 và Memory

Codex, Claude Code và Antigravity dùng **cùng hai MCP server** để giảm đọc lại tài liệu và tránh mất ngữ cảnh giữa các lượt bàn giao:

- **Context7** (`@upstash/context7-mcp`): tài liệu API theo đúng phiên bản thư viện.
- **Memory** (`@modelcontextprotocol/server-memory`): knowledge graph lưu trong **một file chung** cho cả ba agent.

Repo (`docs/`, `AGENTS.md`, code, git log) vẫn là **nguồn sự thật**. Memory chỉ là chỉ mục và ghi nhớ nhanh; nếu Memory mâu thuẫn với repo thì làm theo repo, rồi sửa Memory.

## 1. Quy tắc bắt buộc

### Context7: tra tài liệu trước khi code API thư viện

1. Trước khi viết hoặc sửa code gọi API của thư viện hay dịch vụ, tra Context7: `resolve-library-id`, rồi `query-docs` với **đúng phiên bản đang dùng**. Ví dụ: hàm và hook của WordPress, Facebook Graph API (v26.0, xem `storyweb-core/inc/facebook.php`), WordPress Playground CLI (3.1.57), plugin ngoài như Post Views Counter.
2. Không gửi secret, token, biến môi trường Railway, nội dung chương hay dữ liệu người dùng trong câu hỏi gửi Context7. Context7 là dịch vụ bên ngoài.
3. Nếu Context7 lỗi hoặc hết quota, dùng tài liệu chính thức (developer.wordpress.org, developers.facebook.com), rồi ghi "Context7 không dùng được" trong bàn giao.
4. Khi bàn giao, ghi thư viện/phiên bản và chủ đề đã tra. Với thay đổi chỉ ở CSS, văn bản hoặc logic thuần không dùng API thư viện, ghi rõ `Context7: không cần`.

### Memory: đọc khi nhận việc, ghi khi bàn giao

1. **Nhận việc:** `search_nodes` theo khu vực (`unlock`, `facebook`, `season`, `reader-preferences`, `railway`…) và ID việc nếu có, rồi mới đọc file.
2. **Bàn giao:** ghi những gì agent sau cần biết mà khó tìm lại trong repo: quyết định, bẫy kỹ thuật, contract, việc còn dở. Rồi ghi `Memory: đã cập nhật <entity>` trong lời bàn giao.
3. **Không ghi:** secret, mật khẩu, token, biến môi trường Railway, cookie, email hay dữ liệu người đọc, nội dung chương. Không chép nguyên tài liệu; chỉ ghi tóm tắt kèm đường dẫn file hoặc commit.
4. Chỉ sửa hoặc xóa observation do chính agent mình ghi, trừ khi observation đó sai so với repo (ghi rõ lý do khi xóa).
5. Trước khi ghi, tìm lại entity để tránh trùng; chỉ ghi quyết định hoặc bẫy mới. Nếu server không kết nối, ghi lý do trong lời bàn giao và tiếp tục dựa vào repo.

### Quy ước đặt tên trong Memory

| entityType | Tên entity | Ví dụ |
| --- | --- | --- |
| `task` | ID việc (nếu có) | `WP1`, `UI2` |
| `area` | khu vực code, kebab-case | `unlock-grant`, `reader-preferences`, `season`, `facebook` |
| `decision` | `decision:<chủ đề>` | `decision:rewarded-fail-closed` |
| `gotcha` | `gotcha:<chủ đề>` | `gotcha:railway-php-cli-home`, `gotcha:windows-powershell-path` |
| `contract` | `contract:<tên>` | `contract:unlock-cookie` |
| `agent` | `codex`, `claude-code`, `antigravity` | |

- Mỗi observation có dạng `YYYY-MM-DD <agent>: <nội dung ngắn> (<file|commit>)`, ví dụ: `2026-10-18 claude-code: PHP CLI trên Railway không nạp wp-config-railway.php, phải tự define WP_HOME (scripts/wp/server-script-template.php)`.
- Quan hệ (`relationType`) dùng động từ thể chủ động: `owns`, `depends_on`, `supersedes`, `blocks`, `documents`. Ví dụ: `claude-code owns unlock-grant`, `season depends_on decor`.

## 2. Cấu hình từng agent

File Memory dùng chung (không commit, đã có trong `.gitignore`):

```
E:\Dev\StoryWeb\.agents\memory\storyweb-memory.jsonl
```

Mọi worktree phải trỏ về **file này ở checkout chính**, không dùng đường dẫn tương đối, vì mỗi worktree có thư mục `.agents` riêng. Nếu repo nằm ở chỗ khác, đặt biến môi trường `STORYWEB_MEMORY_FILE`.

### Claude Code

Đã có `.mcp.json` ở gốc repo, dùng `cmd /c npx` cho Windows. Mỗi **worktree** mở riêng trong VS Code phải chứa `.mcp.json`: tạo worktree mới từ `main` hiện hành hoặc cập nhật nhánh cũ trước khi bắt đầu. Claude Code yêu cầu tin cậy workspace và duyệt server cấp project; xem trạng thái bằng `/mcp` trong extension, hoặc `claude mcp list` nếu CLI có trong `PATH`. Cấu hình có `${STORYWEB_MEMORY_FILE:-...}`; Claude Code hỗ trợ cú pháp fallback này. [Tài liệu Claude Code](https://code.claude.com/docs/en/mcp).

### Codex (`~/.codex/config.toml`, cấp user)

```toml
[mcp_servers.context7]
command = "cmd"
args = ["/c", "npx", "-y", "@upstash/context7-mcp@latest"]
startup_timeout_sec = 60

[mcp_servers.memory]
command = "cmd"
args = ["/c", "npx", "-y", "@modelcontextprotocol/server-memory"]
startup_timeout_sec = 60

[mcp_servers.memory.env]
MEMORY_FILE_PATH = 'E:\Dev\StoryWeb\.agents\memory\storyweb-memory.jsonl'
```

Codex đọc `AGENTS.md`, nên quy tắc ở mục 1 áp dụng qua `AGENTS.md`.

### Antigravity (`~/.gemini/config/mcp_config.json`)

**Không dùng Docker.** Hai server chạy bằng `npx` giống Codex:

```json
{
  "mcpServers": {
    "context7": { "command": "cmd", "args": ["/c", "npx", "-y", "@upstash/context7-mcp@latest"] },
    "memory": { "command": "cmd", "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-memory"],
                "env": { "MEMORY_FILE_PATH": "E:/Dev/StoryWeb/.agents/memory/storyweb-memory.jsonl" } }
  }
}
```

Antigravity đọc `.agents/rules/project-context.md`; quy tắc được nhắc lại ở đó. File `~/.gemini/config/mcp_config.json` là vị trí cấu hình hiện hành theo [hướng dẫn Google Antigravity](https://codelabs.developers.google.com/getting-started-google-antigravity). Trong Settings → Customizations → Installed MCP Servers, bấm Refresh, bật `context7` và `memory` cho project; kiểm tra tool xuất hiện trước khi nhận việc. Nếu máy còn file cũ `~/.gemini/antigravity/mcp_config.json`, không coi file đó là nguồn cấu hình chính.

### Kiểm tra trước khi nhận việc và khi bàn giao

1. Codex: kiểm tra `context7`/`memory` trong danh sách MCP của phiên; gọi thử một truy vấn tài liệu không nhạy cảm khi cần API, và `search_nodes` cho ID việc. CLI/IDE dùng cùng cấu hình MCP theo [tài liệu OpenAI](https://developers.openai.com/learn/docs-mcp).
2. Claude Code: `/mcp` phải cho thấy hai server đã kết nối trong đúng worktree đang làm. Trạng thái `Pending approval` cần duyệt trong phiên Claude Code tương ứng. Thực hiện `search_nodes` khi nhận việc.
3. Antigravity: xác nhận hai server đang bật trong project; thực hiện `search_nodes` khi nhận việc. Config đúng tên chưa đủ chứng minh tool đã kết nối.
4. Bàn giao: lời bàn giao (tin nhắn cho người dùng hoặc commit message) ghi `Memory: đã tra ...; đã cập nhật ...` và `Context7: ...`, hoặc lý do không cần, không dùng được. Không chép secret hoặc nội dung chương vào MCP.

### Context7 API key (tùy chọn)

Không có key vẫn chạy được, nhưng bị giới hạn lượt gọi. Nếu có key, đặt biến môi trường user `CONTEXT7_API_KEY` (không ghi vào file trong repo). Server Context7 tự đọc biến này.

## 3. Giới hạn cần biết

- Không dùng Docker cho MCP của dự án; chỉ cần Node.js (npx).

- Memory server ghi lại cả file sau mỗi lần sửa. Hai agent ghi **cùng lúc** có thể làm mất một lần ghi. Hãy ghi ngắn, và chỉ ghi lúc bàn giao.
- Không có cơ chế nào ép agent gọi tool. Việc tuân thủ được kiểm bằng dòng `Memory: …` trong bàn giao.
- Sao lưu: file JSONL có thể copy thẳng. Xóa file nghĩa là xóa toàn bộ memory chung.
