# Tài khoản, session và phân quyền CMS (B1)

Backend cho tài khoản độc giả, nhiều tác giả và phân quyền `/panel`. UI đăng nhập/đăng ký/quản lý tài khoản chưa làm — phần đó dành cho Antigravity dựa trên contract dưới đây.

## Mô hình

| Thành phần | Chi tiết |
| --- | --- |
| `users.password_hash` | scrypt (N=32768, r=8, p=1, salt 16 byte), định dạng `scrypt$N$r$p$salt$hash`. Nullable: user cũ chưa có mật khẩu không đăng nhập được. |
| `user_sessions` | Cookie `storyweb_session` chứa token ngẫu nhiên 32 byte; DB chỉ lưu SHA-256. Hạn 30 ngày, `HttpOnly`, `SameSite=Lax`, `Secure` khi `NODE_ENV=production`. Mỗi request đọc lại user + role từ DB, nên logout/đổi quyền có hiệu lực ngay. |
| `stories.owner_id` | Nullable, `ON DELETE SET NULL`. `NULL` = truyện cũ/do admin quản lý. Server tự gán khi tạo: editor/admin tài khoản → id của họ; admin mật khẩu cũ → `NULL`. |
| `auth_rate_limits` | Bộ đếm cửa sổ cố định trong PostgreSQL (dùng chung mọi instance). Khóa là SHA-256 của email/IP, không lưu email/IP thô. |

### Vai trò

| Danh tính | Truyện trong CMS | Tài khoản |
| --- | --- | --- |
| Chưa đăng nhập | 401 | 401 |
| `reader` | 403 | 403 |
| `editor` | Chỉ truyện có `owner_id` = mình (xem, sửa, xóa); ID của người khác → 403, ID không tồn tại → 404 | 403 |
| `admin` (tài khoản) hoặc cookie `storyweb_admin` cũ | Toàn bộ | Toàn bộ |

Khi trình duyệt có cả hai cookie: admin tài khoản > admin mật khẩu cũ > editor.

### Giới hạn thử

| Hành động | Khóa | Ngưỡng |
| --- | --- | --- |
| `POST /api/auth/login` | email | 5 lần / 15 phút (xóa khi đăng nhập đúng) |
| `POST /api/auth/login` | IP | 30 lần / 15 phút |
| `POST /api/auth/register` | IP | 10 lần / giờ |
| `PATCH /api/auth/account` (đổi mật khẩu) | user | 5 lần / 15 phút |
| `POST /api/admin/login` (cũ) | IP | 10 lần / 15 phút (xóa khi đúng) |

Mỗi lần thử được đếm **trước** khi kiểm tra mật khẩu, nên vượt ngưỡng thì mật khẩu đúng cũng bị 429 tới hết cửa sổ. IP lấy phần tử **cuối** của `X-Forwarded-For` (proxy Railway thêm vào).

### Kiểm tra nguồn (CSRF)

Mọi route `POST/PATCH/DELETE` mới, cùng `POST/DELETE /api/admin/stories`, từ chối request có header `Origin` khác host (`Host`, `X-Forwarded-Host` hoặc `NEXT_PUBLIC_SITE_URL`) với `403 cross_origin`. Request không có `Origin` (curl, server) vẫn được xử lý. Fetch cùng origin từ trình duyệt không cần làm gì thêm.

## Định dạng lỗi

```json
{ "error": "Thông báo tiếng Việt hiển thị được", "code": "invalid_input", "fields": { "email": "Email không hợp lệ." }, "retryAfterSeconds": 900 }
```

`fields` chỉ có ở lỗi kiểm tra dữ liệu; `retryAfterSeconds` (và header `Retry-After`) chỉ có ở 429.

| Mã HTTP | `code` |
| --- | --- |
| 400 | `invalid_input`, `invalid_credentials` (chỉ khi đổi mật khẩu sai mật khẩu hiện tại) |
| 401 | `unauthenticated`, `invalid_credentials` |
| 403 | `forbidden`, `cross_origin` |
| 404 | `not_found` |
| 409 | `email_unavailable` |
| 413 | `payload_too_large` (body > 8 KB ở route auth) |
| 429 | `rate_limited` |
| 503 | `unavailable`, `not_configured` |

`PublicUser` (không bao giờ chứa hash/token):

```json
{ "id": "uuid", "email": "ban@example.com", "displayName": "Tên", "role": "reader", "createdAt": "2026-09-23T10:00:00.000Z" }
```

## Route cho độc giả/tác giả

### `POST /api/auth/register`

Request `{ "email": string, "displayName": string, "password": string }`. Email được trim + chữ thường, tối đa 254 ký tự; tên 1–100 ký tự; mật khẩu 8–128 ký tự. Trường `role` bị bỏ qua — luôn tạo `reader`.

- `201` `{ "user": PublicUser, "expiresAt": ISO }` + cookie session (đăng nhập luôn).
- `400 invalid_input` + `fields`; `409 email_unavailable`; `413`; `429`.

### `POST /api/auth/login`

Request `{ "email": string, "password": string }`.

- `200` `{ "user": PublicUser, "expiresAt": ISO }` + cookie session.
- `401 invalid_credentials` — cùng một thông báo cho email sai định dạng, không tồn tại hoặc sai mật khẩu.
- `400` khi thiếu trường/JSON hỏng; `429 rate_limited`.

### `POST /api/auth/logout`

Không cần body. Xóa session trên server và xóa cookie. Luôn `200 { "ok": true }` (kể cả khi chưa đăng nhập).

### `GET /api/auth/session`

Luôn `200`:

```json
{ "user": PublicUser | null, "expiresAt": ISO | null, "legacyAdmin": false, "canManageStories": false, "canManageUsers": false }
```

UI dùng `canManageStories` để hiện liên kết Studio, `canManageUsers` cho màn hình quản lý tài khoản.

### `PATCH /api/auth/account`

Request (mỗi trường tùy chọn): `{ "displayName"?: string, "currentPassword"?: string, "newPassword"?: string }`. Đổi mật khẩu cần `currentPassword` và đăng xuất mọi session khác (session hiện tại giữ nguyên). Không đổi được email/role.

- `200 { "user": PublicUser }`; `400` (+`fields.currentPassword` nếu sai); `401`; `429`.

## Route quản trị (admin tài khoản hoặc cookie admin cũ)

### `GET /api/admin/users?role=editor&q=abc&limit=50&offset=0`

`200 { "users": PublicUser[], "limit": 50, "offset": 0 }`. `q` tìm trong email/tên. `limit` 1–100.

### `POST /api/admin/users`

Request `{ "email", "displayName", "password", "role": "reader" | "editor" | "admin" }` → `201 { "user": PublicUser }`; `400`/`409`.

### `PATCH /api/admin/users/{id}`

Request `{ "role"?, "displayName"?, "password"? }` → `200 { "user": PublicUser }`. Đổi role hoặc đặt lại mật khẩu sẽ thu hồi mọi session của user đó. Admin tài khoản không tự đổi role của mình (`400`). `404` khi không có user.

### `POST /api/admin/stories/owner`

Request `{ "storyId": uuid, "ownerId": uuid | null }` → `200 { "story": { "id", "ownerId" } }`. Chủ sở hữu phải là editor/admin; `null` trả truyện về cho admin.

## Thay đổi với API truyện hiện có

`GET/POST/DELETE /api/admin/stories` giữ nguyên request/response cho `PublishingPanel`, thêm:

- Mỗi `ManagedStory` có thêm `ownerId: string | null` (chỉ đọc; server bỏ qua `ownerId` trong body).
- Danh sách chỉ gồm truyện danh tính hiện tại được quản lý.
- Lỗi có thêm `code`; `403 forbidden` khi sửa/xóa truyện của người khác; "không tìm thấy" đổi từ `400` sang `404`.
- `POST /api/admin/login` giữ contract `{ password }` → `{ ok: true }`, thêm `429` khi thử sai quá 10 lần/15 phút/IP.
- `POST /api/admin/logout` xóa cả cookie admin cũ lẫn session tài khoản (nút Đăng xuất của Studio dùng route này).

`/panel` chấp nhận admin cũ hoặc session editor/admin; reader đang đăng nhập thấy thông báo không có quyền. Quyền đọc chương khóa **không** đổi trong B1 (vẫn là cookie mở khóa 5 phút).

## Tạo editor/admin đầu tiên

Không commit mật khẩu. Hai cách:

1. **Qua API với admin cũ:** đăng nhập `/panel` bằng `ADMIN_PANEL_PASSWORD`, rồi gọi `POST /api/admin/users` (sau này qua UI quản lý tài khoản).
2. **Lệnh quản trị** (chạy nơi có `DATABASE_URL` của DB đích, sau `npm run db:migrate`):

   ```bash
   node scripts/create-user.mjs --email tacgia@example.com --name "Tác giả" --role editor
   ```

   Script đọc mật khẩu từ stdin (hoặc biến `STORYWEB_NEW_USER_PASSWORD`), không nhận qua tham số dòng lệnh. Nếu email đã có, script đổi role (và mật khẩu nếu nhập) rồi thu hồi session cũ.

## Kiểm thử

Trên DB local/test riêng, **không** dùng Railway production:

```bash
npm run db:migrate
npm run build
npm start                                  # instance 1, cổng 3000
PORT=3001 npm start                        # instance 2 (tùy chọn) dùng cùng DATABASE_URL
STORYWEB_TEST_URL=http://127.0.0.1:3000 STORYWEB_TEST_URL_2=http://127.0.0.1:3001 \
  STORYWEB_TEST_ADMIN_PASSWORD=... node scripts/test-auth.mjs
STORYWEB_TEST_MIGRATION_DB_URL=postgres://.../db_trong node scripts/test-migration.mjs
```

`test-auth.mjs` kiểm tra: 401/403 cho anonymous/reader, đăng ký bỏ qua `role`, đăng nhập/đăng xuất/session bị thu hồi và hết hạn, ma trận editor A/B/admin theo ID trực tiếp, không đổi được owner/role từ client, hạ quyền có hiệu lực ngay, đổi mật khẩu, giới hạn body/JSON hỏng, kiểm tra `Origin`, rate limit qua hai instance, admin mật khẩu cũ. `test-migration.mjs` chạy `0000`+`0001`, chèn dữ liệu cũ, chạy `0002` và xác nhận không mất dòng nào.

## Rollback migration 0002

Migration chỉ thêm bảng/cột. Nếu cần quay lại bản trước B1: deploy lại commit cũ (code cũ bỏ qua các cột mới). Chỉ khi cần xóa hẳn schema:

```sql
DROP TABLE IF EXISTS user_sessions, auth_rate_limits;
ALTER TABLE stories DROP COLUMN IF EXISTS owner_id;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash, DROP COLUMN IF EXISTS updated_at;
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1790175948074;
```

Làm vậy sẽ mất tài khoản/mật khẩu và quyền sở hữu truyện; sao lưu trước.
