import { NextResponse } from "next/server";
import { apiError, crossOrigin, isSameOriginRequest, readJsonObject, unavailable } from "@/lib/request-guard";
import { failChallenge } from "@/lib/unlock-challenges";
import { currentReaderId, readerHash } from "@/lib/unlock";

export const runtime = "nodejs";

/** Reader closed the ad / no-fill / SDK error: the pending challenge is burned so it can never be granted. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return crossOrigin();
  const body = await readJsonObject(request, 1024);
  if (body === "too_large" || !body || typeof body.nonce !== "string" || !/^[a-f0-9]{64}$/.test(body.nonce)) return apiError(400, "invalid_input", "Thiếu mã lượt xem quảng cáo.");
  const readerId = await currentReaderId();
  try {
    if (readerId) await failChallenge(body.nonce, readerHash(readerId));
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return unavailable(error);
  }
}
