// Creates or promotes an account from the command line (first editor/admin without committing credentials).
//
//   STORYWEB_NEW_USER_PASSWORD='...' node scripts/create-user.mjs --email tacgia@example.com --name "Tác giả" --role editor
//
// Without STORYWEB_NEW_USER_PASSWORD the password is read from stdin (one line), so it never appears in argv.
// For an existing email, the role (and password, if given) is updated and all of that user's sessions are revoked.
// Reads DATABASE_URL from the environment, .env.local or .env.
import { randomBytes, scrypt } from "node:crypto";
import { createInterface } from "node:readline";
import { config } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"], quiet: true });

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
const email = String(args.get("email") ?? "").trim().toLowerCase();
const name = String(args.get("name") ?? "").replace(/\s+/g, " ").trim();
const role = args.get("role") ?? "editor";

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("--email không hợp lệ.");
if (!["reader", "editor", "admin"].includes(role)) throw new Error("--role phải là reader, editor hoặc admin.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL chưa được cấu hình.");

async function readPassword() {
  if (process.env.STORYWEB_NEW_USER_PASSWORD !== undefined) return process.env.STORYWEB_NEW_USER_PASSWORD;
  if (process.stdin.isTTY) process.stderr.write("Mật khẩu (để trống nếu chỉ đổi vai trò tài khoản đã có): ");
  const rl = createInterface({ input: process.stdin, terminal: false });
  for await (const line of rl) { rl.close(); return line; }
  return "";
}

// Same format as src/lib/password.ts: scrypt$N$r$p$salt$hash (base64url).
function hashPassword(password) {
  const N = 32768, r = 8, p = 1, salt = randomBytes(16);
  return new Promise((resolve, reject) => scrypt(password.normalize("NFKC"), salt, 64, { N, r, p, maxmem: 128 * N * r * 2 }, (error, key) =>
    error ? reject(error) : resolve(["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join("$"))));
}

const password = await readPassword();
if (password && (password.length < 8 || password.length > 128)) throw new Error("Mật khẩu cần 8–128 ký tự.");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const existing = await client.query("SELECT id FROM users WHERE lower(email) = $1", [email]);
  const passwordHash = password ? await hashPassword(password) : null;
  if (existing.rows[0]) {
    const id = existing.rows[0].id;
    await client.query("UPDATE users SET role = $2, password_hash = COALESCE($3, password_hash), display_name = COALESCE(NULLIF($4, ''), display_name), updated_at = now() WHERE id = $1", [id, role, passwordHash, name]);
    await client.query("DELETE FROM user_sessions WHERE user_id = $1", [id]);
    console.log(`Đã cập nhật tài khoản ${email} → ${role}${passwordHash ? " (đã đặt mật khẩu mới)" : ""}; các phiên cũ đã bị thu hồi.`);
  } else {
    if (!passwordHash) throw new Error("Tài khoản mới cần mật khẩu.");
    if (!name || name.length > 100) throw new Error("--name cần 1–100 ký tự cho tài khoản mới.");
    const created = await client.query("INSERT INTO users (email, display_name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id", [email, name, role, passwordHash]);
    console.log(`Đã tạo tài khoản ${email} (${role}), id ${created.rows[0].id}.`);
  }
} finally {
  await client.end();
}
