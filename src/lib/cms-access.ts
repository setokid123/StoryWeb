import "server-only";

import { hasAdminSession } from "@/lib/admin-auth";
import { getCurrentSession, type PublicUser } from "@/lib/auth";

/**
 * Who is acting in the CMS. Always derived on the server from cookies + DB, never from the request body.
 * - legacy-admin: the ADMIN_PANEL_PASSWORD cookie (kept for the Railway deployment).
 * - user: an account session; role is re-read from the DB on every request.
 */
export type CmsActor =
  | { kind: "legacy-admin"; isAdmin: true; userId: null }
  | { kind: "user"; isAdmin: boolean; userId: string; user: PublicUser };

export type CmsAccess =
  | { ok: true; actor: CmsActor }
  | { ok: false; status: 401 | 403; user?: PublicUser };

export async function getCmsAccess(): Promise<CmsAccess> {
  const session = await getCurrentSession();
  const role = session?.user.role;
  // Most privileged identity wins when a browser holds both cookies.
  if (session && role === "admin") return { ok: true, actor: { kind: "user", isAdmin: true, userId: session.user.id, user: session.user } };
  if (await hasAdminSession()) return { ok: true, actor: { kind: "legacy-admin", isAdmin: true, userId: null } };
  if (session && role === "editor") return { ok: true, actor: { kind: "user", isAdmin: false, userId: session.user.id, user: session.user } };
  return session ? { ok: false, status: 403, user: session.user } : { ok: false, status: 401 };
}

export async function getAdminAccess(): Promise<CmsAccess> {
  const access = await getCmsAccess();
  if (access.ok && !access.actor.isAdmin) return { ok: false, status: 403, user: access.actor.kind === "user" ? access.actor.user : undefined };
  return access;
}
