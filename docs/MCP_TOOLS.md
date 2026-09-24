# MCP dùng chung: Context7 và Memory

Codex, Claude Code và Antigravity dùng **cùng hai MCP server** để giảm đọc lại tài liệu và tránh mất ngữ cảnh giữa các lượt bàn giao:

- **Context7** (`@upstash/context7-mcp`): tài liệu API theo đúng phiên bản thư viện.
- **Memory** (`@modelcontextprotocol/server-memory`): knowledge graph lưu trong **một file chung** cho cả ba agent.

Repo (`docs/`, `WORKBOARD.md`, code, git log) vẫn là **nguồn sự thật**. Memory chỉ là chỉ mục và ghi nhớ nhanh; nếu Memory mâu thuẫn với repo thì làm theo repo, rồi sửa Memory.

## 1. Quy tắc bắt buộc

### Context7: tra tài liệu trước khi code API thư viện

1. Trước khi viết hoặc sửa code gọi API của thư viện (Next.js 16, React 19, Drizzle ORM, `pg`, `lucide-react`…), tra Context7: `resolve-library-id`, rồi `query-docs` với **phiên bản trong `package.json`**.
2. **Next.js:** `node_modules/next/dist/docs/` được ưu tiên hơn Context7 (xem khối Next.js trong `AGENTS.md`). Chỉ dùng Context7 để bổ sung.
3. Không gửi secret, `DATABASE_URL`, nội dung chương hay dữ liệu người dùng trong câu hỏi gửi Context7. Context7 là dịch vụ bên ngoài.
4. Nếu Context7 lỗi hoặc hết quota, tiếp tục bằng docs trong `node_modules`, rồi ghi "Context7 không dùng được" trong bàn giao.

### Memory: đọc khi nhận việc, ghi khi bàn giao

1. **Nhận việc:** `search_nodes` theo ID task (`M3`, `U5`…) và khu vực (`unlock`, `reader-preferences`, `css`…), rồi mới đọc file.
2. **Bàn giao:** ghi những gì agent sau cần biết mà khó tìm lại trong repo: quyết định, bẫy kỹ thuật, contract, việc còn dở. Mỗi mục ghi xong thêm dòng `Memory: đã cập nhật <entity>` vào ô bàn giao trên `WORKBOARD.md`.
3. **Không ghi:** secret, mật khẩu, token, `DATABASE_URL`, cookie, email hay dữ liệu người đọc, nội dung chương. Không chép nguyên tài liệu; chỉ ghi tóm tắt kèm đường dẫn file hoặc commit.
4. Chỉ sửa hoặc xóa observation do chính agent mình ghi, trừ khi observation đó sai so với repo (ghi rõ lý do khi xóa).

### Quy ước đặt tên trong Memory

| entityType | Tên entity | Ví dụ |
| --- | --- | --- |
| `task` | ID trên workboard | `M3`, `U5`, `I3` |
| `area` | khu vực code, kebab-case | `unlock-grant`, `reader-preferences`, `theme`, `css-tokens` |
| `decision` | `decision:<chủ đề>` | `decision:rewarded-fail-closed` |
| `gotcha` | `gotcha:<chủ đề>` | `gotcha:next16-rsc-query`, `gotcha:windows-powershell-path` |
| `contract` | `contract:<tên>` | `contract:ReaderPreferencesView` |
| `agent` | `codex`, `claude-code`, `antigravity` | |

- Mỗi observation có dạng `YYYY-MM-DD <agent>: <nội dung ngắn> (<file|commit>)`, ví dụ: `2026-09-24 claude-code: RSC request phải dùng ?_rsc rỗng, giá trị khác bị 307 (scripts/test-unlock-link.mjs)`.
- Quan hệ (`relationType`) dùng động từ thể chủ động: `owns`, `depends_on`, `supersedes`, `blocks`, `documents`. Ví dụ: `claude-code owns M3`, `M3 depends_on U5`.

## 2. Cấu hình từng agent

File Memory dùng chung (không commit, đã có trong `.gitignore`):

```
E:\Dev\StoryWeb\.agents\memory\storyweb-memory.jsonl
```

Mọi worktree phải trỏ về **file này ở checkout chính**, không dùng đường dẫn tương đối, vì mỗi worktree có thư mục `.agents` riêng. Nếu repo nằm ở chỗ khác, đặt biến môi trường `STORYWEB_MEMORY_FILE`.

### Claude Code

Đã có `.mcp.json` ở gốc repo, dùng `cmd /c npx` cho Windows. Lần đầu mở, Claude Code sẽ hỏi có bật server trong `.mcp.json` không; chọn đồng ý. Kiểm tra bằng `/mcp` hoặc `claude mcp list`.

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

Nếu dùng Docker như cấu hình hiện tại, **server memory phải mount thư mục chung**. Placeholder `/local-directory` làm mỗi lần chạy `--rm` mất dữ liệu và không chia sẻ với agent khác:

```json
"memory": {
  "command": "docker",
  "args": ["run", "-i", "--rm",
           "-v", "E:/Dev/StoryWeb/.agents/memory:/data",
           "-e", "MEMORY_FILE_PATH=/data/storyweb-memory.jsonl",
           "mcp/memory"]
}
```

Nếu không có Docker, dùng dạng `npx` giống Codex:

```json
"memory": { "command": "cmd", "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-memory"], "env": { "MEMORY_FILE_PATH": "E:\\Dev\\StoryWeb\\.agents\\memory\\storyweb-memory.jsonl" } }
```

Antigravity đọc `.agents/rules/project-context.md`; quy tắc được nhắc lại ở đó.

### Context7 API key (tùy chọn)

Không có key vẫn chạy được, nhưng bị giới hạn lượt gọi. Nếu có key, đặt biến môi trường user `CONTEXT7_API_KEY` (không ghi vào file trong repo). Server Context7 tự đọc biến này.

## 3. Giới hạn cần biết

- Memory server ghi lại cả file sau mỗi lần sửa. Hai agent ghi **cùng lúc** có thể làm mất một lần ghi. Hãy ghi ngắn, và chỉ ghi lúc bàn giao.
- Không có cơ chế nào ép agent gọi tool. Việc tuân thủ được kiểm bằng dòng `Memory: …` trong bàn giao; Codex kiểm dòng này khi tích hợp.
- Sao lưu: file JSONL có thể copy thẳng. Xóa file nghĩa là xóa toàn bộ memory chung.
