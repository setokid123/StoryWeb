# Mở khóa chương, cài đặt quảng cáo (M2) — contract

Logic M2 do Claude Code bàn giao; view U4 của Antigravity (commit `dadb41e`) được ghép qua container. Codex sửa các lỗi bảo mật và giao diện phát hiện trong review tích hợp I2.

## Dữ liệu (migration `0003_m2_site_settings_unlock`)

| Bảng | Nội dung |
| --- | --- |
| `site_settings` | Một dòng `id='default'`: `unlock_enabled` (mặc định `false`), `unlock_mode` (`link`\|`rewarded`), `unlock_link_url` (null = dùng `CLICK_UNLOCK_URL`), `unlock_revision`, `ad_slots` (jsonb 4 cờ), `version` (khóa lạc quan), `updated_at/by`. Migration chèn sẵn dòng mặc định (tắt hết). |
| `site_settings_audit` | Ai đổi (`actor_label`, `actor_user_id`), lúc nào, `before/after` (không chứa secret). |
| `unlock_challenges` | Mỗi lượt "xem quảng cáo": `nonce`, provider, hash cookie người đọc, `revision`, trạng thái `pending → verified → consumed` hoặc `failed`, `provider_ref` unique (chống phát lại). |

Rollback ứng dụng: migration chỉ thêm bảng/enum và không đổi cấu trúc cũ, nên deploy lại code trước M2 và giữ nguyên schema. Không xóa bảng hoặc sửa ledger migration trên production khi rollback thông thường.

## Quyền đọc 5 phút (entitlement)

- Server quyết định mode cho mỗi request (`resolveUnlock()`): `off` nếu `UNLOCK_EMERGENCY_OFF=true`, không đọc được cài đặt, admin chưa bật, hoặc phương thức đã chọn chưa sẵn sàng. Không có trạng thái "bật một nửa".
- Grant là cookie `storyweb_unlock` HttpOnly, SameSite=Lax, Secure ở production, `Max-Age=300`: `v2.<mode>.<revision>.<expiresMs>.<HMAC(CLICK_UNLOCK_SECRET)>`. Chỉ hợp lệ khi **mode và revision trùng cấu hình hiện tại**, chưa hết hạn và không dài quá 5 phút.
- `unlock_revision` tăng khi admin đổi bật/tắt, phương thức hoặc URL. Mọi grant cũ và nonce rewarded đang chờ mất hiệu lực ngay. Đổi slot quảng cáo không tăng revision.
- Kiểm quyền ở cả trang `/doc/[slug]/[chapter]` và `getManagedChapterBody()`. Chương `≤ freeChapterCount` (mặc định chương 1) luôn đọc được. Body khóa không có trong HTML hay payload RSC; route là `force-dynamic`.
- Cookie cũ `storyweb_click_unlock` không còn được chấp nhận.
- Khi grant hết hạn, trang gỡ body khỏi DOM ngay theo thời lượng còn lại do server cấp rồi gọi `router.refresh()`. Kiểm lại khi tab được focus/hiện lên sau khi timer nền bị trì hoãn. Server kiểm lại thời hạn khi lấy body và ngay trước khi truyền props.
- Cookie là bearer grant 5 phút; nếu ai đó sao chép được giá trị cookie thì có thể dùng trong thời hạn đó. HttpOnly/Secure giảm khả năng đánh cắp từ trình duyệt, nhưng không chứng minh một danh tính người đọc riêng.

## Nhấp liên kết

`GET /unlock/visit` → `303` tới đích + cookie grant, hoặc `503 mode_unavailable`, `400 not_user_initiated`. `POST` trả `405` và không cấp grant.

- GET (nút `<a target="_blank">` của U4) chỉ được chấp nhận khi trình duyệt gửi Fetch Metadata: `Sec-Fetch-Site: same-origin`, `Sec-Fetch-User: ?1`, `Sec-Fetch-Mode: navigate`, `Sec-Fetch-Dest: document`. Request prefetch, `<img>`, link cross-site, crawler hoặc client không có các header này bị từ chối.
- URL đích (M4): **mọi tên miền công khai** dùng `https:`, tối đa 2048 ký tự (tính cả sau chuẩn hóa), không kèm user/password. Bị từ chối: scheme khác (`http:`, `javascript:`, `data:`, `file:`…), IP literal (kể cả dạng `0x7f.1`, `2130706433`, IPv6), `localhost`/`*.localhost`, tên miền một nhãn và TLD nội bộ/đặc biệt (`.local`, `.internal`, `.lan`, `.home`, `.corp`, `.test`, `.example`, `.invalid`, `.onion`, `.arpa`…), ký tự khoảng trắng/điều khiển và URL sai cú pháp.
- Một hàm dùng chung `normalizeUnlockLinkUrl` (`src/lib/unlock-link.ts`, không phụ thuộc server) được dùng ở PUT admin, readiness, `/unlock/visit` và form trong `/panel/cai-dat`. Server lưu dạng chuẩn: host chữ thường/punycode, bỏ dấu chấm cuối. Ví dụ `https://WWW.Wikipedia.org./` được lưu thành `https://www.wikipedia.org/`.
- **Shopee vẫn là trường hợp riêng:** `shopee.vn` (cả subdomain), `shp.ee`, `shope.ee` chỉ dùng được khi `SHOPEE_GATE_APPROVED=true`; cài đặt admin không vượt được chặn này. So khớp theo host đã chuẩn hóa, nên `shopee.vn.evil.com` không bị coi là Shopee (và không cần cờ). Link khác không cần cờ Shopee.
- Phương thức còn cần `CLICK_UNLOCK_ENABLED=true` và `CLICK_UNLOCK_SECRET` (≥ 32 ký tự). Admin **lưu URL được khi công tắc tắt** (không cần cờ); chỉ khi bật công tắc thì server kiểm readiness.
- Server **không truy cập** URL. Link rút gọn hoặc redirect có thể dẫn tới đích khác với tên miền đã lưu; hệ thống không xác minh đích cuối.
- Fetch Metadata chỉ là tín hiệu do trình duyệt gửi cho một thao tác điều hướng, có thể bị giả bởi HTTP client. Hệ thống **không thể xác nhận** người đọc đã xem trang đích hay mua hàng; đây là giới hạn của chế độ link.

## Xem quảng cáo có thưởng

| Route | Ai gọi | Kết quả |
| --- | --- | --- |
| `POST /api/unlock/rewarded/start` | Trình duyệt (cùng origin) | `200 { nonce, expiresAt, revision, provider: {…public} }`, đặt cookie `storyweb_reader` nếu chưa có. `503` khi mode khác rewarded, `429` khi vượt 20 lượt/10 phút/người đọc hoặc 60/IP. |
| `POST /api/unlock/rewarded/callback` | **Server nhà cung cấp** | Adapter kiểm chữ ký trên `nonce` + mã giao dịch. `200 {status: "verified"\|"already"}`, `401` chữ ký sai, `409` nonce không tồn tại/hết hạn/đã hủy hoặc mã giao dịch đã dùng, `503` provider chưa sẵn sàng. |
| `POST /api/unlock/rewarded/claim` `{nonce}` | Trình duyệt | `200 {status:"granted", expiresAt}` + cookie grant (chỉ một lần), `202 {status:"pending"}` khi callback chưa tới, `409` khi sai người đọc, sai revision, đã dùng hoặc đã hủy. |
| `POST /api/unlock/rewarded/cancel` `{nonce}` | Trình duyệt | Hủy nonce khi quảng cáo bị đóng, không có quảng cáo hoặc lỗi. |
| `POST /api/unlock/rewarded/mock-complete` | Chỉ dev/test | Đóng vai callback của provider mock; trả `404` khi mock không bật. |

Provider: chỉ có `mock`. Mock bị từ chối khi `NODE_ENV=production` (trừ khi có `STORYWEB_ALLOW_MOCK_REWARDED=1`) và luôn bị từ chối trên Railway. `google_ad_manager`/`gam`/`adsense` được đánh dấu `unavailable`, vì Google không có xác minh phía server cho rewarded web. Chưa có provider thì admin không lưu được mode rewarded đang bật (`409 mode_not_ready`) và người đọc không thấy nút quảng cáo.

Luồng client nằm trong `src/lib/rewarded-flow.ts`, là module thuần có unit test:
- mất mạng, lỗi SDK, không có quảng cáo, người đọc đóng quảng cáo, hoặc callback không tới → không cấp quyền và luôn hủy nonce;
- sự kiện "hoàn thành" từ SDK chỉ dùng để bắt đầu poll `claim`, không tự cấp quyền.

## Cài đặt admin

`GET /api/admin/settings` và `PUT /api/admin/settings` chỉ dành cho admin: tài khoản `admin` hoặc cookie `ADMIN_PANEL_PASSWORD` cũ. Kết quả: chưa đăng nhập `401`, reader/editor `403`, `Origin` khác site `403`. Kiểu dữ liệu nằm trong `src/lib/settings-contract.ts`.

- `GET` → `AdminSettingsPayload`: `settings`, `readiness.link/rewarded {state: ready|unconfigured|unavailable|blocked, reason}`, `effectiveMode`, `emergencyOff`, `envLinkUrlConfigured`, `display`, `accessMinutes`, `audit`. Không có secret.
- `PUT {version, unlockEnabled, unlockMode, unlockLinkUrl|null, adSlots}` → payload mới. Lỗi:
  - `400 invalid_input` + `fields.linkUrl/unlockMode/adSlots`;
  - `409 conflict` khi `version` cũ;
  - `409 mode_not_ready` khi bật một phương thức chưa sẵn sàng. `error` nêu đúng điều kiện còn thiếu. Nếu do URL (thiếu hoặc không hợp lệ) thì lỗi nằm ở `fields.linkUrl`. Nếu do máy chủ (`CLICK_UNLOCK_ENABLED` khác `true`, thiếu `CLICK_UNLOCK_SECRET`, chưa có provider rewarded) thì lỗi nằm ở `fields.unlockMode`. Không có gì được lưu; client giữ nguyên bản nháp. Gửi lại với `unlockEnabled: false` để lưu URL và vị trí quảng cáo.
  - `503` khi DB lỗi.
- Trang `/panel/cai-dat`: admin thấy cài đặt, editor/reader thấy thông báo 403, chưa đăng nhập bị chuyển về `/panel`. Studio chỉ hiện liên kết "Quảng cáo & mở khóa" cho admin.

## Quảng cáo hiển thị

- Registry `src/lib/ad-placements.ts` gồm `home_feed`, `story_detail`, `reader_end`, `search_results`.
- `getDisplayAd(placement)` trả `null` khi admin tắt vị trí, provider chưa cấu hình hoặc DB lỗi; khi đó không render gì.
- Nhà cung cấp và mã đơn vị chỉ lấy từ env, có kiểm tra định dạng (`ca-pub-…`, mã chỉ gồm chữ số). Admin chỉ bật/tắt, không nhập được HTML hay script.
- `reader_end` chỉ hiện ở chương đã được phép đọc.
- Container client: loading → filled / no-fill (timeout 8 giây) / error. Trong lúc tải, slot giữ khung và mount node quảng cáo; no-fill hoặc lỗi thì ẩn cả slot. Impression hay click không bao giờ cấp quyền đọc.

## Ghép view U4

| Container (Claude) | View (U4) | Ghi chú |
| --- | --- | --- |
| `reader-panel.tsx` | `UnlockGateView`, `ReaderNavigation`, `ChapterListDialog` | Container giữ Escape/Tab trap của dialog khóa (bọc ngoài view), state mở/đóng drawer và trả focus về nút mở. `key` theo chương để reset state. Trạng thái rewarded được đổi sang `idle\|pending\|unavailable\|error`. |
| `ad-slot-container.tsx` | `AdSlot` | Render mount node cả khi `loading`, giữ kích thước slot cho đến khi quảng cáo xác nhận filled/no-fill. |
| `unlock-settings-container.tsx` | `UnlockSettingsView` | Container render thêm khối "Chi tiết mở khóa": ô URL, mode đang áp dụng, revision, người sửa, hoàn tác. |

**Đề xuất đổi contract cho Antigravity:**
1. `UnlockSettingsView.canSave` nên là `!isUnlockEnabled || selectedModeReady`. Hiện view chặn lưu ngay cả khi đang tắt mở khóa. Container tạm báo `isReady: true` khi đang tắt, nên badge có thể hiện "Sẵn sàng" dù phương thức chưa cấu hình; mỗi khi bật lên, trạng thái thật hiện lại.
2. Thêm ô URL liên kết, `effectiveMode`, revision/người sửa và nút hoàn tác vào view settings.
3. `UnlockGateView` nên nhận `message` (thông báo từ server/flow) và `onClose`; hiện container phát thông báo qua vùng `role=status` ẩn.
4. `ReaderNavigation` nên nhận ref cho nút "Danh sách chương" để trả focus.

## Kiểm thử

Chạy trên DB test riêng (không dùng DB `railway` production). Script chạy tổng: tạo DB → `test-migration.mjs` → `db:migrate` → build → 3 instance → các test bên dưới.

| Lệnh | Kết quả (2026-09-24) |
| --- | --- |
| `node scripts/test-migration.mjs` (DB trống) | Đạt: 0000+0001+dữ liệu → 0002 → 0003, không mất dòng nào, cài đặt mặc định tắt |
| `node scripts/test-auth.mjs` (hồi quy B1) | 15/15 |
| `node --experimental-strip-types scripts/test-rewarded-flow.mjs` | 9/9: mất mạng, 503/429, thiếu adapter, SDK crash/lỗi/no-fill/đóng quảng cáo, callback không tới, claim bị từ chối, callback đến trễ, component bị unmount |
| `node scripts/test-m2.mjs` (3100 mock, 3101 không có provider, 3102 DB không truy cập được) | 14/14: quyền admin/editor/reader/anonymous; validation/CSRF/xung đột; ma trận off/link/rewarded; GET Fetch Metadata; grant bị sửa/hết hạn/quá 5 phút/sai revision/sai mode/cookie cũ; callback giả/phát lại/sai người đọc/claim hai lần; hủy hoặc đổi revision; thiếu provider; DB lỗi thì fail closed; slot quảng cáo; audit |
| `node scripts/smoke.mjs` (`STORYWEB_TEST_GATE_MODE=example`) | Đạt |

## Env mới

Xem `.env.example`: `UNLOCK_EMERGENCY_OFF`, `REWARDED_MOCK_SECRET` và `STORYWEB_ALLOW_MOCK_REWARDED` (chỉ test), `DISPLAY_AD_PROVIDER`, `ADSENSE_CLIENT_ID`, `ADSENSE_SLOT_*`, `STORYWEB_ALLOW_MOCK_ADS` (chỉ test). Production không cần biến mới để giữ nguyên trạng thái hiện tại (mọi thứ tắt).

## Còn bị chặn

- **Rewarded:** chưa có nhà cung cấp quảng cáo có thưởng cho web có callback xác minh phía server. Người dùng cần chọn provider, cấp tài khoản/credential, rồi Claude viết adapter và test end-to-end. Chưa được coi là hoàn tất production.
- **Link Shopee:** cần chấp thuận riêng và `SHOPEE_GATE_APPROVED=true`. Link HTTPS công khai khác dùng được ngay khi server có `CLICK_UNLOCK_ENABLED=true` và secret. Production hiện có `CLICK_UNLOCK_ENABLED=false`; Codex quyết định bật sau review M4.
- **AdSense:** adapter đã viết nhưng chưa test với tài khoản thật (chưa có `ca-pub`/mã đơn vị). Trang cũng chưa có `ads.txt` và chưa có thông báo đồng ý (consent) cho người dùng EU.
