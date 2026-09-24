// M4 unit tests for the shared unlock-link normalizer (used by the admin API, readiness, /unlock/visit and the settings UI).
//   node --experimental-strip-types --no-warnings scripts/test-unlock-link-url.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { isShopeeHost, normalizeUnlockLinkUrl, UNLOCK_LINK_MAX_LENGTH } from "../src/lib/unlock-link.ts";

const off = { shopeeApproved: false };
const on = { shopeeApproved: true };
const check = (url, options = off) => normalizeUnlockLinkUrl(url, options);
const problem = (url, options = off) => {
  const result = check(url, options);
  return result.ok ? "ok" : result.problem;
};

test("any public https domain is accepted and normalized", () => {
  for (const [input, expected] of [
    ["https://www.wikipedia.org/", "https://www.wikipedia.org/"],
    ["https://example.com/", "https://example.com/"],
    ["  https://WWW.Wikipedia.ORG./wiki/A?b=1#c  ", "https://www.wikipedia.org/wiki/A?b=1#c"],
    ["https://bücher.de/", "https://xn--bcher-kva.de/"],
    ["https://sub.domain.co.uk:8443/path", "https://sub.domain.co.uk:8443/path"],
    ["https://localhost.com/", "https://localhost.com/"],
    ["https://tiki.vn/p/1", "https://tiki.vn/p/1"],
  ]) {
    const result = check(input);
    assert.ok(result.ok, `${input} → ${result.ok ? "" : result.problem}`);
    assert.equal(result.url, expected);
    assert.equal(result.shopee, false);
  }
});

test("non-https schemes are refused", () => {
  for (const url of ["http://example.com/", "javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "ftp://example.com/", "HTTP://example.com"]) {
    assert.equal(problem(url), "not_https", url);
  }
});

test("credentials are refused", () => {
  assert.equal(problem("https://user:pw@example.com/"), "credentials");
  assert.equal(problem("https://user@example.com/"), "credentials");
});

test("IP literals, localhost and internal names are refused (including encoded IPv4)", () => {
  for (const url of [
    "https://127.0.0.1/", "https://10.0.0.1/", "https://192.168.1.1/", "https://169.254.169.254/latest/meta-data",
    "https://0x7f.1/", "https://2130706433/", "https://127.1/", "https://017700000001/",
    "https://[::1]/", "https://[fe80::1]/", "https://[::ffff:127.0.0.1]/",
    "https://localhost/", "https://LOCALHOST./", "https://app.localhost/", "https://intranet/",
    "https://storyweb.internal/", "https://nas.local/", "https://printer.lan/", "https://x.home.arpa/",
    "https://svc.corp/", "https://a.test/", "https://a.invalid/", "https://site.example/", "https://hidden.onion/",
    "https://a_b.com/", "https://-bad.com/", "https://bad-.com/",
  ]) {
    assert.equal(problem(url), "not_public", url);
  }
});

test("malformed, whitespace/control characters and overlong URLs are refused", () => {
  const tab = String.fromCharCode(9);
  const zeroWidth = String.fromCharCode(0x200b);
  for (const url of ["https://", "not a url", "https://exa mple.com/", `https://exa${tab}mple.com/`, `https://example.com/${zeroWidth}`, "https://example.123/", "//example.com/"]) {
    assert.equal(problem(url), "malformed", JSON.stringify(url));
  }
  assert.equal(problem(""), "missing");
  assert.equal(problem("   "), "missing");
  assert.equal(problem(null), "missing");
  const base = "https://example.com/";
  assert.equal(problem(base + "a".repeat(UNLOCK_LINK_MAX_LENGTH - base.length)), "ok", "exactly 2048 characters is allowed");
  assert.equal(problem(base + "a".repeat(UNLOCK_LINK_MAX_LENGTH - base.length + 1)), "too_long");
  // Percent-encoding during normalization must not push the stored URL past the limit.
  assert.equal(problem(base + "ệ".repeat(700)), "too_long");
});

test("direct Shopee links need the approval flag; lookalikes are not Shopee", () => {
  for (const url of ["https://shopee.vn/p/1", "https://SHOPEE.VN./p", "https://m.shopee.vn/x", "https://shp.ee/a", "https://shope.ee/a", "https://s.shp.ee/a"]) {
    assert.equal(problem(url, off), "shopee_unapproved", url);
    const approved = check(url, on);
    assert.ok(approved.ok && approved.shopee, `${url} with approval`);
  }
  for (const url of ["https://shopee.vn.evil-example.com/", "https://evilshopee.vn/", "https://shopee.com/", "https://notshp.ee/"]) {
    const result = check(url, off);
    assert.ok(result.ok && !result.shopee, url);
  }
  assert.equal(isShopeeHost("shopee.vn"), true);
  assert.equal(isShopeeHost("shopee.vn.example.com"), false);
});

test("every refusal carries a Vietnamese reason; none mentions a Shopee-only restriction", () => {
  for (const url of ["http://a.com", "https://u:p@a.com", "https://127.0.0.1", "https://", "", "https://shopee.vn/"]) {
    const result = check(url);
    assert.equal(result.ok, false);
    assert.ok(result.reason.length > 10);
    assert.doesNotMatch(result.reason, /chỉ hỗ trợ/i);
  }
});
