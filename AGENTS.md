# StoryWeb: quy ước chung cho coding agents

Codex, Claude Code và Antigravity dùng chung repository này. Trạm Truyện 2D là website đọc truyện chạy trên **WordPress tự host**, deploy trên Railway tại https://tramtruyen2d.up.railway.app. Đọc trước khi nhận việc:

- `README.md`;
- `docs/VAN_HANH_RAILWAY.md`: máy mới, site thử, deploy, sửa dữ liệu thật;
- `docs/DESIGN_SYSTEM.md`, nếu sửa giao diện.

`CLAUDE.md` nhắc lại các quy tắc dưới đây cho Claude Code, kèm chi tiết từng tính năng.

## Cấu trúc

- `wp-content/themes/thu-cac`: **giao diện**, gồm PHP template, CSS và JS thuần, chỉ lo trình bày. Gồm kính lỏng, ba kiểu trang trí (thường, Halloween, Giáng sinh; chọn ở Giao diện → Giao diện theo mùa) và hiệu ứng khi cuộn.
- `wp-content/plugins/storyweb-core`: **logic**, gồm:
  - truyện và chương, đường dẫn, mã truyện `TT2D…`;
  - **khóa chương phía máy chủ**;
  - mở khóa bằng link, thống kê, đăng Facebook.
- `deploy/railway-wp`: Docker image WordPress cho Railway.
- `scripts/wp`:
  - site thử bằng WordPress Playground và các bộ kiểm tra;
  - công cụ nhập truyện từ bot;
  - công cụ chạy script trên server (`railway-php.sh`, mẫu `server-script-template.php`).
- `brand`: logo và ảnh cho Facebook.
- `chapter/` (không commit): bot cào truyện và dữ liệu thô để nhập.
- `docs/archive`: tài liệu của bản Next.js cũ và tiến độ viết lại truyện (đã xong). Chỉ để tra lịch sử, không làm theo. Xem [docs/archive/README.md](docs/archive/README.md).

## Phân vai mặc định

Người dùng giao việc trực tiếp cho từng agent và có thể giao khác với phân vai dưới đây. Không còn bảng việc chung: bảng cũ nằm ở `docs/archive/nextjs/WORKBOARD.md`.

- **Codex:** review bảo mật, kiểm tra trước và sau deploy.
- **Claude Code:** plugin `storyweb-core`: quyền đọc, mở khóa, thống kê, tích hợp dịch vụ (Facebook, quảng cáo), script dữ liệu.
- **Antigravity:** giao diện trong theme `thu-cac`: bố cục, CSS, responsive, accessibility. Nhận dữ liệu từ plugin; không tự quyết định quyền đọc.

## Quy tắc

1. **Chương khóa không bao giờ gửi body xuống client khi chưa có quyền.** Quy tắc áp dụng cho mọi đường ra: HTML, REST, RSS, embed, sitemap, tìm kiếm. Quyền đọc luôn kiểm phía server, trong plugin; đổi theme không được làm lộ chương khóa. Sửa bất cứ gì đụng nội dung hoặc trang đọc thì chạy `scripts/wp/check-content.mjs`.
2. **Dữ liệu ra và vào.** Giá trị in ra trang phải qua `esc_*`. Dữ liệu vào phải qua `sanitize_*`. Truy vấn DB dùng `$wpdb->prepare`. Form và action trong wp-admin phải kiểm nonce và `current_user_can`.
3. **Plugin trước, tự code sau** (`docs/PLUGINS.md`). Dùng plugin trên wordpress.org khi có plugin phù hợp. Chỉ tự code khi không có, hoặc khi plugin làm lộ chương khóa. Plugin đụng nội dung hay trang đọc phải qua `check-content.mjs` trên site thử. Việc cài plugin lên site thật do người dùng làm.
4. **Mở khóa và quảng cáo.**
   - Không tự mở popup hay tự chuyển hướng người đọc.
   - Quảng cáo có thưởng chỉ cấp quyền khi server xác minh được bằng chứng; callback từ trình duyệt không đủ.
   - Mở khóa bằng link phải giữ giới hạn tần suất và cookie ký HMAC (`inc/unlock.php`).
5. **Facebook.** Chỉ đăng giới thiệu truyện hoặc chương **miễn phí**. Mã Page không bao giờ in ra trang hay log.
6. **Repo công khai trên GitHub.**
   - Không commit mật khẩu, token, khóa SSH, biến môi trường Railway hay mã instance.
   - Không in secret ra terminal hoặc log.
7. **Dữ liệu trên site thật** (`docs/VAN_HANH_RAILWAY.md`).
   - Chạy script với `--dry` trước, đọc báo cáo, rồi mới `--apply`.
   - Sao lưu bản gốc trước khi ghi.
   - Xóa file trong `/tmp` của server sau khi dùng.
   - Không đụng project hay database Railway của bản Next.js cũ.
8. **Không xóa hoặc ghi đè thay đổi chưa commit của agent khác.** Xem `git status` trước khi sửa. File tạm như script sinh nội dung, bản dump hay JSON trung gian thì để trong `.scratch/` (git bỏ qua) hoặc ngoài repo, không để ở gốc repo. Xong việc thì dọn.
9. **Giao diện.**
   - Chữ tiếng Việt.
   - Chạy được trên màn hình 320 px, dùng được bằng bàn phím, tôn trọng `prefers-reduced-motion`.
   - Trang đọc giữ yên tĩnh: không trang trí nền, không hiệu ứng khi cuộn.
   - Logic trang đọc nằm trong `assets/js/reader-core.js` và có unit test. Sửa logic thì sửa test.

## Nhánh, commit, deploy

- **Push lên `main` là deploy lên site thật.** Railway build lại image và thay theme và plugin trên volume; site gián đoạn vài chục giây. Chỉ đưa lên `main` những gì đã qua phần Kiểm tra bên dưới.
- Mỗi agent làm trên nhánh riêng `codex/*`, `claude/*` hoặc `antigravity/*`. Khi hai agent chạy cùng lúc, mỗi agent dùng worktree riêng. Đưa vào `main` bằng merge fast-forward rồi push.
- Đổi file CSS hoặc JS của theme thì tăng `Version` trong `style.css` và `THU_CAC_VERSION` trong `functions.php`, để trình duyệt tải file mới. Đổi plugin thì tăng `Version` và `STORYWEB_CORE_VERSION` trong `storyweb-core.php`.
- Commit message nói rõ đã đổi gì và đã chạy kiểm tra nào.

## Kiểm tra trước khi bàn giao

- `npm test`: logic trang đọc.
- Site thử WordPress Playground với `scripts/wp/blueprint-dev.json` và các script trong `scripts/wp/` (hướng dẫn chạy: `scripts/wp/README.md`):

  | Script | Kiểm tra gì | Lưu ý |
  | --- | --- | --- |
  | `check-content.mjs` | nội dung và chống lộ chương khóa | |
  | `check-browser.mjs` | giao diện ở các khổ màn hình, Sáng/Tối | |
  | `check-admin.mjs` | wp-admin | |
  | `check-unlock.mjs` | mở khóa bằng link | cần site mới khởi động |
  | `check-facebook.mjs` | đăng Facebook | dùng `mock-facebook.php` thay Facebook; cần site mới khởi động |

- Không có cảnh báo PHP trong log của site thử.
- Sau khi deploy, mở site thật và kiểm: version theme và plugin, trang chủ, một chương khóa.
- Bàn giao ghi: file đã sửa, kiểm tra đã chạy và kết quả, việc còn dở.

## MCP: Context7 và Memory

Theo `docs/MCP_TOOLS.md`, khai báo trong `.mcp.json`:

- Tra **Memory** khi nhận việc.
- Tra **Context7** trước khi dùng API của thư viện hay dịch vụ (WordPress, Facebook Graph, Playground…).
- Ghi Memory khi bàn giao: quyết định, bẫy kỹ thuật, việc còn dở. Không ghi secret, dữ liệu người đọc hay nội dung chương.

Repo là nguồn sự thật. Nếu Memory mâu thuẫn với repo thì làm theo repo, rồi sửa Memory.
