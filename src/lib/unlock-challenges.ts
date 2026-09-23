import "server-only";

import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { unlockChallenges } from "@/db/schema";

const CHALLENGE_MS = 10 * 60 * 1000;

export async function createChallenge(provider: string, readerHash: string, revision: number): Promise<{ nonce: string; expiresAt: Date }> {
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + CHALLENGE_MS);
  const db = getDb();
  await db.insert(unlockChallenges).values({ nonce, provider, readerHash, revision, expiresAt });
  if (Math.random() < 0.05) void db.delete(unlockChallenges).where(lt(unlockChallenges.expiresAt, new Date(Date.now() - 24 * 60 * 60 * 1000))).catch(() => undefined);
  return { nonce, expiresAt };
}

/**
 * Provider callback: pending → verified, once. A providerRef (provider transaction id) can be used only once,
 * so replaying a callback for another nonce fails on the unique constraint.
 */
export async function markChallengeVerified(provider: string, nonce: string, providerRef: string): Promise<"verified" | "already" | "rejected"> {
  try {
    const [row] = await getDb().update(unlockChallenges)
      .set({ status: "verified", providerRef, verifiedAt: new Date() })
      .where(and(eq(unlockChallenges.nonce, nonce), eq(unlockChallenges.provider, provider), eq(unlockChallenges.status, "pending"), gt(unlockChallenges.expiresAt, new Date())))
      .returning({ nonce: unlockChallenges.nonce });
    if (row) return "verified";
  } catch (error) {
    const code = (error as { code?: string; cause?: { code?: string } })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
    if (code === "23505") return "rejected";
    throw error;
  }
  const [existing] = await getDb().select({ status: unlockChallenges.status, providerRef: unlockChallenges.providerRef }).from(unlockChallenges).where(eq(unlockChallenges.nonce, nonce)).limit(1);
  return existing && existing.providerRef === providerRef && existing.status !== "pending" ? "already" : "rejected";
}

export type ClaimResult = "granted" | "pending" | "invalid";

/** Reader claim: verified → consumed, atomically, only for the same reader and the current revision. */
export async function claimChallenge(nonce: string, readerHash: string, revision: number): Promise<ClaimResult> {
  const db = getDb();
  const [row] = await db.update(unlockChallenges).set({ status: "consumed", consumedAt: new Date() })
    .where(and(eq(unlockChallenges.nonce, nonce), eq(unlockChallenges.readerHash, readerHash), eq(unlockChallenges.revision, revision), eq(unlockChallenges.status, "verified"), isNull(unlockChallenges.consumedAt), gt(unlockChallenges.expiresAt, new Date())))
    .returning({ nonce: unlockChallenges.nonce });
  if (row) return "granted";
  const [pending] = await db.select({ nonce: unlockChallenges.nonce }).from(unlockChallenges)
    .where(and(eq(unlockChallenges.nonce, nonce), eq(unlockChallenges.readerHash, readerHash), eq(unlockChallenges.revision, revision), eq(unlockChallenges.status, "pending"), gt(unlockChallenges.expiresAt, new Date()))).limit(1);
  return pending ? "pending" : "invalid";
}

/** Reader cancelled / ad failed: the challenge can no longer be verified or claimed. */
export async function failChallenge(nonce: string, readerHash: string): Promise<void> {
  await getDb().update(unlockChallenges).set({ status: "failed" })
    .where(and(eq(unlockChallenges.nonce, nonce), eq(unlockChallenges.readerHash, readerHash), eq(unlockChallenges.status, "pending")));
}
