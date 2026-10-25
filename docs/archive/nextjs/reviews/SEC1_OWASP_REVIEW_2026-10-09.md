# SEC1 — Rà soát bảo mật OWASP (2026-10-09)

Dùng skill `owasp-security` (bản `8ac7965`, chỉ gồm markdown, không có script) theo OWASP Top 10:2025 và ASVS 5.0. Rà `main` tại `2dac2f0`. Gồm đọc mã **và** test động trên một build local với database Railway riêng `storyweb_sec1_test` (đã xóa; không đụng DB `railway`). Không sửa mã sản phẩm.

## Kết luận

**Không có lỗ hổng Critical hay High.** Nền bảo mật của dự án tốt: phân quyền kiểm trên server ở mọi route ghi, truy vấn tham số hóa (Drizzle), kiểm CSRF theo Origin + cookie `SameSite=Lax` `HttpOnly`, băm mật khẩu scrypt so sánh hằng thời gian, quyền đọc chương ký HMAC kiểm trên server, body chương khóa không bao giờ bị tuần tự hóa xuống client, rate limit lưu trong Postgres, cấu hình fail-closed.

Hai phát hiện **Medium**: (a) mở khóa bằng link bị bot cào hàng loạt vì `/unlock/visit` không rate limit và là cổng mềm theo thiết kế; (b) cào tốc độ cao có thể làm **sập web do cạn tài nguyên** (không cache + pool 10 không timeout + không rate limit route đọc). Các mục còn lại là **Low / phòng thủ theo lớp** hoặc **Info**.

## Test động đã chạy (26/27 kiểm tra; 1 là nhiễu test, không phải lỗ hổng)

Trên build local, script `scratchpad/sec1-probe.mjs` (request bình thường, mỗi mục chạy vài lần, tự dọn tài khoản/truyện test):

- **A01 IDOR:** editor B không sửa/xóa/thấy truyện của editor A (403; danh sách của B loại truyện của A). *Lần chạy có một dòng delete trả 400 thay vì 403; chạy lại riêng lẻ trả đúng 403 (`Bạn không có quyền xóa`), nên là nhiễu trạng thái của lần chạy, cả hai đều từ chối.*
- **A01 leo thang quyền:** editor không gọi được `/api/admin/users`, đổi chủ sở hữu truyện, hay sửa site settings (403). PATCH hồ sơ không nhận trường `role` (không tự lên admin). Đăng ký bỏ qua trường `role` (user mới luôn là `reader`). Reader không tạo được truyện (403).
- **A01 CSRF:** POST với `Origin: https://evil.example` bị 403.
- **A01 thiếu xác thực:** GET `/api/admin/{stories,users,settings}` và PATCH `/api/auth/account` khi chưa đăng nhập đều 401.
- **A05 injection:** slug chứa `'; DROP TABLE` bị validation chặn (400); tìm user với ký tự SQL/ILIKE trả 200, 0 dòng (tham số hóa + escape `%_`).
- **A01 SSRF / open redirect:** URL mở khóa trỏ `169.254.169.254`, `127.0.0.1`, `localhost`, `[::1]`, `http://` đều bị chặn (400); Shopee vẫn cần chấp thuận riêng; `/unlock/visit` đòi Fetch Metadata điều hướng cùng origin do người đọc chủ động.
- **Quyền đọc:** body chương 2 (khóa) vắng mặt trong cả HTML lẫn payload RSC khi chưa có grant.
- **A09:** không có secret nào bị in ra trong các response lấy mẫu; body sai định dạng không lộ stack trace; cookie admin có `HttpOnly` + `SameSite=Lax`.

## Phát hiện

### [MEDIUM] Mở khóa bằng link có thể bị bot cào hàng loạt (CWE-799, OWASP A06:2025 / A04 LLM-không-áp-dụng)
Location:   src/app/unlock/visit/route.ts (không có rate limit); src/lib/request-guard.ts `userActivatedNavigation`
Path:       HTTP client (curl/node) tự đặt header `Sec-Fetch-*` → GET `/unlock/visit` → cookie grant HMAC 5 phút → đọc mọi chương khóa
Impact:     Kiểm tra Fetch Metadata chỉ chặn **website khác** tự mở khóa trình duyệt nạn nhân (CSRF) — đúng và cần giữ, vì trình duyệt không cho JS đặt header `Sec-*`. Nhưng một **scraper không phải trình duyệt** đặt được các header đó tùy ý. Đã chứng minh trên build local (DB test riêng): request không header → 400; request **giả header `Sec-Fetch`** → 303 + grant; dùng grant đọc được body chương 2 và 3; **5 lần mint liên tiếp đều 303, không có rate limit**. Nghĩa là bot có thể lấy hết slug từ `/tim-kiem`, tự "bấm link" bằng script, và tải sạch chương khóa ở tốc độ cao. Lưu ý **đây một phần là theo thiết kế**: link-unlock không có thanh toán hay quyền đọc gắn tài khoản — mô hình là "ai bấm cũng đọc 5 phút", nên vốn là cổng mềm. Vấn đề bảo mật là **không có gì giới hạn tần suất**, nên cổng mềm thành "cào thoải mái".
Fix:        (1) Rate limit `/unlock/visit` theo IP bằng `consumeRateLimit` đã có — ví dụ N grant/IP/cửa sổ; đây là thay đổi hiệu quả nhất và vá đúng chỗ "5/5 không giới hạn". (2) Cân nhắc giới hạn số chương một grant/IP đọc được trong 5 phút. (3) Mạnh nhất: chặn bot ở edge (Cloudflare trước Railway). (4) Chấp nhận bản chất cổng mềm: muốn chặn cứng phải dùng quyền đọc gắn tài khoản hoặc rewarded (server xác minh). Thuộc logic server (khu vực Claude) + hạ tầng (Codex) — ghi chủ sở hữu trước khi code.
Confidence: Confirmed (chứng minh end-to-end trên build local)

### [MEDIUM] Cào tốc độ cao có thể làm sập web do cạn tài nguyên (CWE-770 / CWE-400, OWASP A06:2025)
Location:   src/db/client.ts (`new Pool({ max: 10 })` không có timeout); 12 route `force-dynamic` không cache; `getCatalogStories` không `LIMIT`; không rate limit route đọc
Path:       Scraper gửi nhiều request/giây vào `/`, `/tim-kiem`, `/doc/...` → mỗi request truy vấn thẳng PostgreSQL → pool 10 kết nối cạn → request xếp hàng chờ vô hạn → bộ nhớ/độ trễ tăng → `/api/health` cũng cần kết nối nên bắt đầu fail → Railway restart container → gián đoạn
Impact:     **Không crash do lỗi code — mà do cạn tài nguyên (availability).** Chuỗi lý do, tất cả xác nhận từ code:
            - Mọi trang đọc là `force-dynamic`, **không cache, không `revalidate`** → mỗi lượt cào = vài truy vấn DB.
            - `/` và `/tim-kiem` nạp **toàn bộ** truyện đã xuất bản mỗi lần (không `LIMIT`, không phân trang) — nặng nhất, mà scraper hay gọi `/tim-kiem` để liệt kê.
            - Pool `max: 10`, **không `connectionTimeoutMillis`** (mặc định chờ mãi) và **không `statement_timeout`** → khi quá tải, request thứ 11 trở đi chờ vô hạn, dồn ứ.
            - Không rate limit route đọc → không có gì chặn ở tầng ứng dụng.
            - Một instance Railway, không autoscale mặc định → không có gì hấp thụ đợt tải.
            Vài request thì không sao. Một scraper quyết tâm ở hàng trăm req/s liên tục **nhiều khả năng** gây chậm → timeout → gián đoạn thực tế, với pool kết nối là nút thắt đầu tiên và health check fail là thứ biến "chậm" thành "restart". Mức độ thực tế phụ thuộc gói Railway (CPU/RAM/DB) — chưa rõ nên không khẳng định tuyệt đối.
Fix:        (1) Rate limit theo IP trên route đọc — cùng bản vá với phát hiện cào ở trên, chặn req/s mỗi client. (2) **Cache nội dung công khai**: `/`, `/tim-kiem`, `/truyen/[slug]` đổi `force-dynamic` → ISR/`revalidate` hoặc `unstable_cache` TTL ngắn; bỏ phần lớn tải DB khi bị cào. **Lưu ý:** phần phân tích advisory phụ thuộc (dưới) dựa trên "mọi trang `force-dynamic`" để loại các CVE cache-poisoning; nếu chuyển sang ISR thì phải nâng `next` ≥ 16.3.8 **trước** và kiểm lại các CVE đó. (3) Siết pool: đặt `connectionTimeoutMillis` (ví dụ 5s) để request quá tải fail nhanh thay vì dồn, và `statement_timeout` (ví dụ 10s); cân nhắc tăng `max` nếu gói DB cho phép. (4) Mạnh nhất: CDN/WAF (Cloudflare) cache trang công khai + chặn bot trước khi tới app. (5) Tách health check khỏi pool (hoặc làm rẻ) để pool cạn không làm container flap. Logic/pool thuộc Claude; cache/ISR + edge thuộc Codex điều phối.
Confidence: Confirmed phân tích tĩnh (không chạy load test vào production — đó chính là thứ có thể gây sập). Chưa đo ngưỡng req/s thực tế.

### [LOW] Thiếu các HTTP security header (CWE-693, OWASP A02:2025)
Location:   next.config.ts (không có khối `headers()`); xác nhận trên cả local và production
Path:       Mọi response của ứng dụng → trình duyệt, thiếu header phòng thủ
Impact:     Không có header nào trong: `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Rủi ro cụ thể nhất là **clickjacking trang `/panel`** (thao tác admin) vì không có `frame-ancestors`/`X-Frame-Options`. Không có HSTS nên lần truy cập đầu dễ bị hạ cấp HTTP. Không phải khai thác trực tiếp, nhưng là lớp phòng thủ tiêu chuẩn còn thiếu.
Fix:        Thêm `headers()` trong `next.config.ts`: `X-Frame-Options: DENY` (hoặc `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `Permissions-Policy` tối thiểu. CSP cần `nonce`/hash vì `theme-provider.tsx` dùng inline `<script dangerouslySetInnerHTML>` (nội dung do code sinh, không từ input người dùng); bắt đầu bằng CSP report-only để tránh vỡ giao diện. Thuộc khu vực cấu hình/hạ tầng — nên để Codex quyết định và đặt cùng chỗ với `.railway/railway.ts`.
Confidence: Confirmed (đo header trên cả local và production)

### [LOW] Phụ thuộc có advisory đã biết, hiện chưa với tới được (CWE-1395, OWASP A06:2025 / A03:2025)
Location:   package.json — `next@16.3.6`, `sharp@0.35.4` (transitive), `source-map-js` (transitive)
Path:       `npm audit`: 8 high + 4 moderate. Đã đối chiếu từng advisory với cấu hình thực tế.
Impact:     **Hiện không với tới được:**
            - Next.js SSRF Image Optimization (GHSA-cjq9-62q9-8jv4) chỉ ảnh hưởng khi có `images.remotePatterns` — dự án không cấu hình, và không dùng `next/image`.
            - Cache poisoning SSG/ISR (GHSA-mcj8, GHSA-4jqv) cần trang SSG/ISR — mọi trang ở đây là `force-dynamic`.
            - MCP dev-server info disclosure (GHSA-39w2) chỉ ở dev server, production chạy `next start`.
            - `sharp` < 0.35.5 RCE qua librsvg (GHSA-wq5f) cần xử lý ảnh SVG — dự án không nhận/encode SVG người dùng, không dùng tối ưu ảnh.
            - `source-map-js` DoS chỉ chạy lúc build (postcss), không ở runtime production.
Fix:        Vẫn nên nâng theo bản vá: `next` ≥ 16.3.8 (bản vá, không phải major), `sharp` ≥ 0.35.5. Chạy lại `npm run build` và smoke sau khi nâng. Vì chạm `package.json`/lockfile (khu vực Codex điều phối), ghi chủ sở hữu trước khi nâng.
Confidence: Confirmed (advisory đối chiếu với mã và cấu hình; không dựng được PoC vì điều kiện tiền đề không tồn tại)

### [INFO] Lộ `X-Powered-By: Next.js`
Location:   phản hồi local (production có vẻ được edge `railway-hikari` lược bớt)
Impact:     Tiết lộ framework, hỗ trợ trinh sát. Không phải lỗ hổng.
Fix:        `poweredByHeader: false` trong `next.config.ts` (gộp cùng phần header ở trên).
Confidence: Confirmed

## Đã kiểm và xác nhận tốt (không phải phát hiện)

- **Mật khẩu:** scrypt `N=2^15, r=8, p=1` (~32 MB, memory-hard) — KDF được ASVS 5.0 chấp nhận; so sánh `timingSafeEqual`; `burnPasswordCheck` chống dò theo thời gian cho email không tồn tại.
- **Session:** token 32 byte từ CSPRNG, lưu dưới dạng băm SHA-256; kiểm lại DB mỗi request nên thu hồi/đổi vai trò có hiệu lực ngay; đăng xuất và đổi mật khẩu xóa session.
- **Rate limit:** khóa theo IP **đầu** của `X-Forwarded-For` — đúng với edge Railway (đã tài liệu hóa ở `docs/AUTH_API.md`); đếm nguyên tử trong Postgres; khóa băm, không lưu email/IP thô.
- **Rewarded:** fail-closed; chỉ cấp sau callback ký server-to-server gắn nonce + chống replay bằng ràng buộc unique; mock không chạy trên Railway.
- **Dữ liệu mẫu CMS:** không có tài khoản mặc định trong mã; `ADMIN_PANEL_PASSWORD` là biến môi trường, không hard-code; không có secret trong mã hay lịch sử git (đã quét).
- **LLM/Agentic:** dự án không có tính năng LLM hay agent — các mục LLM Top 10 / Agentic 2026 không áp dụng.

## Chưa làm / cần người dùng

- **Test thực tế trên production:** chờ người dùng deploy và đưa link; sẽ chỉ chạy kiểm tra **không phá hủy** (đọc header, xác nhận chương khóa không lộ body, các route admin đòi xác thực), không dò mật khẩu hay tạo dữ liệu trên production.
- **MFA và kiểm mật khẩu lộ (ASVS L2, 6.3.3 / 6.2.12):** chưa có. Không bắt buộc với mô hình hiện tại; ghi làm lộ trình, không tính là phát hiện.
- **`qa-i19`:** thư mục local chưa track (rác build từ một phiên QA), không nằm trong git; vô hại, nên xóa cục bộ.

Context7/Memory: hai MCP server không kết nối được trong phiên này (CONNECT_TIMEOUT); dùng tài liệu Next.js trong `node_modules/next/dist/docs/` và advisory GitHub thay thế. Không cập nhật được Memory.
