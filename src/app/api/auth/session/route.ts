import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { getCurrentSession } from "@/lib/auth";
import { unavailable } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Always 200: `user` is null when signed out or the session expired/was revoked. */
export async function GET() {
  try {
    const session = await getCurrentSession();
    const legacyAdmin = await hasAdminSession();
    const role = session?.user.role;
    return NextResponse.json({
      user: session?.user ?? null,
      expiresAt: session?.expiresAt ?? null,
      legacyAdmin,
      canManageStories: legacyAdmin || role === "editor" || role === "admin",
      canManageUsers: legacyAdmin || role === "admin",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return unavailable(error);
  }
}
