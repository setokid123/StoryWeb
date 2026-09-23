import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/request-guard";
import { LEGACY_UNLOCK_COOKIE, mintUnlockGrant, resolveUnlock, UNLOCK_COOKIE, unlockCookieOptions } from "@/lib/unlock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Link mode. Only a same-origin POST from the reader's own click on the StoryWeb button mints the 5-minute grant,
 * then the new tab is sent (303) to the configured destination. This proves a click on our site only — not that
 * the reader viewed the destination or bought anything. GET is refused so prefetch/<img>/crawlers never grant.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ từ nguồn khác.", code: "cross_origin" }, { status: 403 });
  // When the browser reports it, require a user-activated top-level navigation.
  const fetchUser = request.headers.get("sec-fetch-user");
  const fetchMode = request.headers.get("sec-fetch-mode");
  if ((fetchUser !== null && fetchUser !== "?1") || (fetchMode !== null && fetchMode !== "navigate")) {
    return NextResponse.json({ error: "Chỉ mở khóa khi bạn chủ động bấm nút.", code: "not_user_initiated" }, { status: 400 });
  }
  const resolved = await resolveUnlock();
  if (resolved.mode !== "link") return NextResponse.json({ error: "Liên kết mở khóa chưa được bật.", code: "mode_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const grant = mintUnlockGrant("link", resolved.revision);
  const response = NextResponse.redirect(resolved.destination, { status: 303 });
  response.cookies.set(UNLOCK_COOKIE, grant.value, unlockCookieOptions);
  response.cookies.delete(LEGACY_UNLOCK_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function GET() {
  return NextResponse.json({ error: "Hãy bấm nút mở liên kết trên trang đọc.", code: "method_not_allowed" }, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
}
