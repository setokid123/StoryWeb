import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/request-guard";
import { LEGACY_UNLOCK_COOKIE, mintUnlockGrant, resolveUnlock, UNLOCK_COOKIE, unlockCookieOptions } from "@/lib/unlock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Link mode. A grant is minted only for a navigation the reader started by clicking the StoryWeb button, then the
 * tab is sent to the configured destination. This proves a click on our site only — not that the reader viewed the
 * destination or bought anything.
 *
 * GET (U4's `<a target="_blank">`) requires the browser's Fetch Metadata to say: same-origin, user-activated,
 * top-level document navigation. Prefetch, <img>, cross-site links, crawlers and clients without these headers are
 * refused. POST (form) is accepted from the same origin.
 */
function refuse(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

async function grant() {
  const resolved = await resolveUnlock();
  if (resolved.mode !== "link") return refuse(503, "mode_unavailable", "Liên kết mở khóa chưa được bật.");
  const issued = mintUnlockGrant("link", resolved.revision);
  const response = NextResponse.redirect(resolved.destination, { status: 303 });
  response.cookies.set(UNLOCK_COOKIE, issued.value, unlockCookieOptions);
  response.cookies.delete(LEGACY_UNLOCK_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function userActivatedNavigation(request: Request, requireHeaders: boolean) {
  const user = request.headers.get("sec-fetch-user");
  const mode = request.headers.get("sec-fetch-mode");
  const dest = request.headers.get("sec-fetch-dest");
  const site = request.headers.get("sec-fetch-site");
  if (requireHeaders && (!user || !mode || !site)) return false;
  if (user !== null && user !== "?1") return false;
  if (mode !== null && mode !== "navigate") return false;
  if (dest !== null && dest !== "document") return false;
  if (site !== null && site !== "same-origin") return false;
  if (request.headers.get("purpose") === "prefetch" || request.headers.get("next-router-prefetch") || request.headers.get("sec-purpose")?.includes("prefetch")) return false;
  return true;
}

export async function GET(request: Request) {
  if (!userActivatedNavigation(request, true)) return refuse(400, "not_user_initiated", "Hãy bấm nút mở liên kết trên trang đọc.");
  return grant();
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return refuse(403, "cross_origin", "Yêu cầu không hợp lệ từ nguồn khác.");
  if (!userActivatedNavigation(request, false)) return refuse(400, "not_user_initiated", "Chỉ mở khóa khi bạn chủ động bấm nút.");
  return grant();
}
