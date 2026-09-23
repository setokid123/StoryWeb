import { NextResponse } from "next/server";
import { clearSessionCookie, revokeCurrentSession } from "@/lib/auth";
import { crossOrigin, isSameOriginRequest, unavailable } from "@/lib/request-guard";

export const runtime = "nodejs";

/** Deletes the session row, so a copied cookie stops working too. Idempotent. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return crossOrigin();
  try {
    await revokeCurrentSession();
  } catch (error) {
    return unavailable(error);
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  clearSessionCookie(response);
  return response;
}
