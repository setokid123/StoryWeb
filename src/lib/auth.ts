import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gt, lt, ne, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { userSessions, users } from "@/db/schema";
import { burnPasswordCheck, hashPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, verifyPassword } from "@/lib/password";

const SESSION_COOKIE = "storyweb_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type UserRole = (typeof users.$inferSelect)["role"];
const USER_ROLES: readonly UserRole[] = ["reader", "editor", "admin"];

/** Safe to return to clients: never includes the password hash or session token. */
export type PublicUser = { id: string; email: string; displayName: string; role: UserRole; createdAt: string };

const publicColumns = { id: users.id, email: users.email, displayName: users.displayName, role: users.role, createdAt: users.createdAt };

function toPublicUser(row: { id: string; email: string; displayName: string; role: UserRole; createdAt: Date }): PublicUser {
  return { id: row.id, email: row.email, displayName: row.displayName, role: row.role, createdAt: row.createdAt.toISOString() };
}

// ---------- validation ----------

export function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 320) return undefined;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

export function normalizeDisplayName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.normalize("NFC").replace(/\s+/g, " ").trim();
  return name.length >= 1 && name.length <= 100 && !/[\u0000-\u001f\u007f]/.test(name) ? name : undefined;
}

export function passwordProblem(value: unknown): string | undefined {
  if (typeof value !== "string") return "Thiếu mật khẩu.";
  if (value.length < PASSWORD_MIN_LENGTH) return `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
  if (value.length > PASSWORD_MAX_LENGTH) return `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`;
  return undefined;
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// ---------- accounts ----------

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; cause?: unknown };
  return value.code === "23505" || isUniqueViolation(value.cause);
}

/** Role is set by the caller (public registration always passes "reader"). */
export async function createUser(input: { email: string; displayName: string; password: string; role: UserRole }): Promise<PublicUser | "email_taken"> {
  const passwordHash = await hashPassword(input.password);
  try {
    const [row] = await getDb().insert(users)
      .values({ email: input.email, displayName: input.displayName, role: input.role, passwordHash })
      .returning(publicColumns);
    return toPublicUser(row);
  } catch (error) {
    if (isUniqueViolation(error)) return "email_taken";
    throw error;
  }
}

/** Returns the user only when the password matches; the same work is done for unknown emails. */
export async function authenticate(email: string, password: string): Promise<PublicUser | undefined> {
  const [row] = await getDb().select({ ...publicColumns, passwordHash: users.passwordHash }).from(users)
    .where(sql`lower(${users.email}) = ${email}`).limit(1);
  if (!row?.passwordHash) {
    await burnPasswordCheck(password);
    return undefined;
  }
  return await verifyPassword(password, row.passwordHash) ? toPublicUser(row) : undefined;
}

export async function listUsers(filter: { role?: UserRole; query?: string; limit: number; offset: number }): Promise<PublicUser[]> {
  const conditions = [];
  if (filter.role) conditions.push(eq(users.role, filter.role));
  if (filter.query) {
    const pattern = `%${filter.query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    conditions.push(sql`(${users.email} ILIKE ${pattern} OR ${users.displayName} ILIKE ${pattern})`);
  }
  const rows = await getDb().select(publicColumns).from(users).where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(users.createdAt)).limit(filter.limit).offset(filter.offset);
  return rows.map(toPublicUser);
}

export async function updateUser(id: string, changes: { displayName?: string; role?: UserRole; password?: string }): Promise<PublicUser | undefined> {
  const values: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (changes.displayName !== undefined) values.displayName = changes.displayName;
  if (changes.role !== undefined) values.role = changes.role;
  if (changes.password !== undefined) values.passwordHash = await hashPassword(changes.password);
  const [row] = await getDb().update(users).set(values).where(eq(users.id, id)).returning(publicColumns);
  return row ? toPublicUser(row) : undefined;
}

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const [row] = await getDb().select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  if (!row?.passwordHash) {
    await burnPasswordCheck(password);
    return false;
  }
  return verifyPassword(password, row.passwordHash);
}

// ---------- sessions ----------

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const db = getDb();
  await db.insert(userSessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  if (Math.random() < 0.05) void db.delete(userSessions).where(lt(userSessions.expiresAt, new Date())).catch(() => undefined);
  return { token, expiresAt };
}

export type SessionInfo = { user: PublicUser; expiresAt: string; tokenHash: string };

/** Resolves the session cookie against the DB on every call, so revoked sessions and role changes apply immediately. */
export async function getCurrentSession(): Promise<SessionInfo | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return undefined;
  const tokenHash = hashToken(token);
  const [row] = await getDb().select({ ...publicColumns, expiresAt: userSessions.expiresAt }).from(userSessions)
    .innerJoin(users, eq(users.id, userSessions.userId))
    .where(and(eq(userSessions.tokenHash, tokenHash), gt(userSessions.expiresAt, new Date()))).limit(1);
  return row ? { user: toPublicUser(row), expiresAt: row.expiresAt.toISOString(), tokenHash } : undefined;
}

export async function revokeCurrentSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(userSessions).where(eq(userSessions.tokenHash, hashToken(token)));
}

export async function revokeUserSessions(userId: string, exceptTokenHash?: string): Promise<void> {
  await getDb().delete(userSessions).where(exceptTokenHash
    ? and(eq(userSessions.userId, userId), ne(userSessions.tokenHash, exceptTokenHash))
    : eq(userSessions.userId, userId));
}

const sessionCookieBase = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export function setSessionCookie(response: NextResponse, session: { token: string; expiresAt: Date }) {
  response.cookies.set(SESSION_COOKIE, session.token, { ...sessionCookieBase, expires: session.expiresAt });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieBase, maxAge: 0 });
}
