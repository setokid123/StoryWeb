// Shared (client + server) validation for the link-unlock destination. Pure: no env, no network.
// The server wraps it in `checkUnlockLinkUrl` (src/lib/unlock.ts) with the real SHOPEE_GATE_APPROVED flag; the
// settings container uses it only to show errors before saving. The server never fetches the URL, so a shortener or
// redirect can still lead elsewhere: a grant proves a click on StoryWeb, not the final destination or a purchase.

export const UNLOCK_LINK_MAX_LENGTH = 2048;

export type UnlockLinkProblem = "missing" | "too_long" | "malformed" | "not_https" | "credentials" | "not_public" | "shopee_unapproved";

export type UnlockLinkCheck =
  | { ok: true; url: string; host: string; shopee: boolean }
  | { ok: false; problem: UnlockLinkProblem; reason: string };

const REASONS: Record<UnlockLinkProblem, string> = {
  missing: "Chưa có URL liên kết mở khóa.",
  too_long: `URL quá dài (tối đa ${UNLOCK_LINK_MAX_LENGTH} ký tự).`,
  malformed: "URL không hợp lệ.",
  not_https: "URL phải dùng https.",
  credentials: "URL không được chứa thông tin đăng nhập.",
  not_public: "URL phải dùng tên miền công khai (không dùng IP, localhost hay tên miền nội bộ).",
  shopee_unapproved: "Liên kết Shopee cần chấp thuận riêng (SHOPEE_GATE_APPROVED=true trên máy chủ) trước khi dùng.",
};

/** Special-use / private TLDs that never resolve on the public internet (RFC 2606, 6761, 6762, 7686, 8375, 9476 and common intranet names). */
const NON_PUBLIC_TLDS = new Set(["localhost", "local", "localdomain", "internal", "intranet", "lan", "home", "corp", "private", "test", "invalid", "example", "onion", "arpa", "alt"]);

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;
// The URL parser silently drops tabs/newlines, so reject whitespace and control characters before parsing.
const UNSAFE_CHARS = /[\s\p{Cc}\p{Cf}]/u;

/** Direct Shopee destinations that stay behind the separate approval flag (any subdomain included). */
export function isShopeeHost(host: string) {
  return host === "shopee.vn" || host.endsWith(".shopee.vn") || ["shp.ee", "shope.ee"].some((base) => host === base || host.endsWith(`.${base}`));
}

function fail(problem: UnlockLinkProblem): UnlockLinkCheck {
  return { ok: false, problem, reason: REASONS[problem] };
}

/**
 * Normalizes an admin-entered destination. Accepts https URLs on any public domain name; rejects credentials,
 * IP literals, localhost and internal names, and direct Shopee links unless `shopeeApproved`.
 * Returns the canonical string (lowercase/punycode host, no trailing dot) that the server stores and redirects to.
 */
export function normalizeUnlockLinkUrl(raw: string | null | undefined, options: { shopeeApproved: boolean }): UnlockLinkCheck {
  const input = raw?.trim() ?? "";
  if (!input) return fail("missing");
  if (input.length > UNLOCK_LINK_MAX_LENGTH) return fail("too_long");
  if (UNSAFE_CHARS.test(input)) return fail("malformed");
  let url: URL;
  try { url = new URL(input); } catch { return fail("malformed"); }
  if (url.protocol !== "https:") return fail("not_https");
  if (url.username || url.password) return fail("credentials");

  // IPv6 literals keep their brackets; IPv4 (including 0x7f.1, 2130706433…) is already normalized to dotted form.
  let host = url.hostname.toLowerCase();
  if (host.startsWith("[") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return fail("not_public");
  if (host.endsWith(".")) host = host.slice(0, -1);
  const labels = host.split(".");
  if (host.length > 253 || labels.length < 2 || !labels.every((label) => LABEL.test(label))) return fail("not_public");
  const tld = labels[labels.length - 1];
  if (!TLD.test(tld) || NON_PUBLIC_TLDS.has(tld)) return fail("not_public");
  url.hostname = host;

  const shopee = isShopeeHost(host);
  if (shopee && !options.shopeeApproved) return fail("shopee_unapproved");
  const normalized = url.toString();
  if (normalized.length > UNLOCK_LINK_MAX_LENGTH) return fail("too_long");
  return { ok: true, url: normalized, host, shopee };
}
