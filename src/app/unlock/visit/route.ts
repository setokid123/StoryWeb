import { NextResponse } from "next/server";
import { CLICK_UNLOCK_COOKIE, clickUnlockCookieOptions, createClickUnlockSession, getClickUnlockDestination } from "@/lib/click-unlock";

export async function GET() {
  const destination = getClickUnlockDestination();
  if (!destination) return NextResponse.json({ error: "Liên kết mở khóa chưa được cấu hình hoặc chưa được chấp thuận." }, { status: 503 });
  const response = NextResponse.redirect(destination, { status: 302 });
  response.cookies.set(CLICK_UNLOCK_COOKIE, createClickUnlockSession(), clickUnlockCookieOptions);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
