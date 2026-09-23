// Unit test for the client rewarded flow: offline, provider/SDK failures, no-fill, closed ad, missing callback.
//   node --experimental-strip-types scripts/test-rewarded-flow.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { FLOW_MESSAGES, runRewardedFlow } from "../src/lib/rewarded-flow.ts";

const NONCE = "a".repeat(64);

/** Fake server: `routes[path]` is a list of responses (or Errors to throw) consumed in order; last one repeats. */
function fakeServer(routes) {
  const calls = [];
  return {
    calls,
    post: async (path, body) => {
      calls.push({ path, body });
      const queue = routes[path];
      if (!queue) throw new Error(`unexpected ${path}`);
      const next = queue.length > 1 ? queue.shift() : queue[0];
      if (next instanceof Error) throw next;
      return next;
    },
  };
}

const started = { status: 200, json: { nonce: NONCE, provider: { provider: "mock" } } };
const ok = { status: 200, json: { ok: true } };
const deps = (server, show, extra = {}) => ({ post: server.post, show, sleep: async () => {}, pollAttempts: 3, pollIntervalMs: 0, ...extra });
const cancelled = (server) => server.calls.some((call) => call.path === "/api/unlock/rewarded/cancel" && call.body?.nonce === NONCE);
const claimed = (server) => server.calls.some((call) => call.path === "/api/unlock/rewarded/claim");

test("offline before start: failed with offline message, nothing to cancel", async () => {
  const server = fakeServer({ "/api/unlock/rewarded/start": [new TypeError("Failed to fetch")] });
  const outcome = await runRewardedFlow(deps(server, async () => "completed"));
  assert.deepEqual(outcome, { state: "failed", message: FLOW_MESSAGES.offline });
});

test("network drops while claiming: failed, challenge burned (best effort)", async () => {
  const server = fakeServer({ "/api/unlock/rewarded/start": [started], "/api/unlock/rewarded/claim": [new TypeError("offline")], "/api/unlock/rewarded/cancel": [new TypeError("offline")] });
  const outcome = await runRewardedFlow(deps(server, async () => "completed"));
  assert.equal(outcome.state, "failed");
  assert.equal(outcome.message, FLOW_MESSAGES.offline);
  assert.ok(cancelled(server));
});

test("mode off / provider down on the server (503) and rate limit (429) → unavailable", async () => {
  for (const status of [503, 429]) {
    const server = fakeServer({ "/api/unlock/rewarded/start": [{ status, json: { error: "x" } }] });
    const outcome = await runRewardedFlow(deps(server, async () => "completed"));
    assert.equal(outcome.state, "unavailable");
  }
});

test("no client adapter for provider → unavailable, challenge burned, no claim", async () => {
  const server = fakeServer({ "/api/unlock/rewarded/start": [started], "/api/unlock/rewarded/cancel": [ok] });
  const outcome = await runRewardedFlow(deps(server, () => null));
  assert.equal(outcome.state, "unavailable");
  assert.ok(cancelled(server) && !claimed(server));
});

test("SDK crash / error / no-fill / closed never claim and always burn", async () => {
  const cases = [
    [async () => { throw new Error("sdk crashed"); }, "failed", FLOW_MESSAGES.failed],
    [async () => "error", "failed", FLOW_MESSAGES.failed],
    [async () => "no_fill", "unavailable", FLOW_MESSAGES.unavailable],
    [async () => "closed", "failed", FLOW_MESSAGES.closed],
  ];
  for (const [show, state, message] of cases) {
    const server = fakeServer({ "/api/unlock/rewarded/start": [started], "/api/unlock/rewarded/cancel": [ok] });
    const outcome = await runRewardedFlow(deps(server, show));
    assert.deepEqual(outcome, { state, message });
    assert.ok(cancelled(server) && !claimed(server));
  }
});

test("provider callback never arrives → failed after polling, burned", async () => {
  const server = fakeServer({ "/api/unlock/rewarded/start": [started], "/api/unlock/rewarded/claim": [{ status: 202, json: { status: "pending" } }], "/api/unlock/rewarded/cancel": [ok] });
  const outcome = await runRewardedFlow(deps(server, async () => "completed"));
  assert.deepEqual(outcome, { state: "failed", message: FLOW_MESSAGES.noConfirmation });
  assert.equal(server.calls.filter((call) => call.path === "/api/unlock/rewarded/claim").length, 3);
  assert.ok(cancelled(server));
});

test("server rejects claim (replay/revision change) → failed with server message", async () => {
  const server = fakeServer({ "/api/unlock/rewarded/start": [started], "/api/unlock/rewarded/claim": [{ status: 409, json: { error: "Lượt xem quảng cáo không hợp lệ hoặc đã dùng." } }], "/api/unlock/rewarded/cancel": [ok] });
  const outcome = await runRewardedFlow(deps(server, async () => "completed"));
  assert.deepEqual(outcome, { state: "failed", message: "Lượt xem quảng cáo không hợp lệ hoặc đã dùng." });
});

test("late callback: pending then granted", async () => {
  const server = fakeServer({ "/api/unlock/rewarded/start": [started], "/api/unlock/rewarded/claim": [{ status: 202, json: { status: "pending" } }, { status: 200, json: { status: "granted", expiresAt: "2026-09-24T10:05:00.000Z" } }] });
  const outcome = await runRewardedFlow(deps(server, async () => "completed"));
  assert.deepEqual(outcome, { state: "granted", message: FLOW_MESSAGES.granted, expiresAt: "2026-09-24T10:05:00.000Z" });
  assert.ok(!cancelled(server));
});

test("component unmounted while polling → stops without granting", async () => {
  const server = fakeServer({ "/api/unlock/rewarded/start": [started], "/api/unlock/rewarded/claim": [{ status: 200, json: { status: "granted" } }] });
  const outcome = await runRewardedFlow(deps(server, async () => "completed", { isCancelled: () => true }));
  assert.equal(outcome.state, "failed");
  assert.ok(!claimed(server));
});
