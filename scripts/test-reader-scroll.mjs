// M5 unit tests for the reader toolbar/dock scroll logic.
//   node --experimental-strip-types --no-warnings scripts/test-reader-scroll.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SCROLL_CONFIG as C, initialScrollState, nextScrollState, resolveReaderChrome } from "../src/lib/reader-scroll.ts";

const VIEW = 800;
const DOC = 10_000;
const at = (y, documentHeight = DOC) => ({ y, viewportHeight: VIEW, documentHeight });
/** Feeds a list of scroll positions, one per frame. */
function run(positions, documentHeight = DOC) {
  let state = initialScrollState(at(positions[0], documentHeight));
  for (const y of positions.slice(1)) state = nextScrollState(state, at(y, documentHeight));
  return state;
}
const base = { endNavInView: false, locked: false, chapterListOpen: false, preferencesOpen: false, toolbarFocused: false, dockFocused: false, toolbarPinned: false, dockPinned: false };

test("at the top: toolbar in place, dock hidden", () => {
  const s = initialScrollState(at(0));
  assert.equal(s.atTop, true);
  assert.equal(s.toolbarHidden, false);
  assert.equal(s.dockShown, false);
  assert.deepEqual(resolveReaderChrome({ ...base, scroll: s }), { toolbar: "top", dockVisible: false });
});

test("scrolling down past the top hides toolbar and dock", () => {
  const s = run([0, 100, 300, 600, 900]);
  assert.equal(s.atTop, false);
  assert.equal(s.toolbarHidden, true);
  assert.equal(s.dockShown, false);
  assert.deepEqual(resolveReaderChrome({ ...base, scroll: s }), { toolbar: "hidden", dockVisible: false });
});

test("scrolling up far enough shows both; small jitter does not flicker", () => {
  const down = run([0, 600, 1200, 2000]);
  const jitter = run([0, 600, 1200, 2000, 1990, 1995, 1985, 1992, 2000 - C.showAfter + 1]);
  assert.equal(jitter.toolbarHidden, true, "less than showAfter upward travel keeps it hidden");
  assert.equal(jitter.dockShown, false);
  const up = run([0, 600, 1200, 2000, 1980, 1950, 2000 - C.showAfter]);
  assert.equal(up.toolbarHidden, false);
  assert.equal(up.dockShown, true);
  assert.deepEqual(resolveReaderChrome({ ...base, scroll: up }), { toolbar: "pinned", dockVisible: true });
  assert.equal(down.toolbarHidden, true);
  // A few pixels back down after showing does not hide again until hideAfter.
  const wobble = run([0, 600, 1200, 2000, 1900, 1900 + C.hideAfter - 1]);
  assert.equal(wobble.toolbarHidden, false);
  const hidden = run([0, 600, 1200, 2000, 1900, 1900 + C.hideAfter]);
  assert.equal(hidden.toolbarHidden, true);
});

test("travel is measured from where the direction changed, not per frame", () => {
  // Many tiny upward steps add up.
  const steps = [0, 3000];
  for (let y = 2998; y >= 3000 - C.showAfter; y -= 2) steps.push(y);
  assert.equal(run(steps).toolbarHidden, false);
});

test("returning to the top resets: toolbar in place, dock hidden", () => {
  const s = run([0, 2000, 1000, 400, 50]);
  assert.equal(s.atTop, true);
  assert.equal(s.dockShown, false);
  assert.equal(resolveReaderChrome({ ...base, scroll: s }).toolbar, "top");
});

test("near the end the dock shows even while scrolling down; toolbar still hides", () => {
  const end = DOC - VIEW;
  const s = run([0, 2000, 5000, end - 300, end - 100]);
  assert.equal(s.dockShown, true);
  assert.equal(s.toolbarHidden, true);
  assert.equal(resolveReaderChrome({ ...base, scroll: s }).dockVisible, true);
});

test("end navigation on screen hides the dock (no duplicate navigation)", () => {
  const s = run([0, 2000, 1900, 1800]);
  assert.equal(s.dockShown, true);
  assert.equal(resolveReaderChrome({ ...base, scroll: s, endNavInView: true }).dockVisible, false);
});

test("short chapter that fits the screen: dock stays hidden at the top", () => {
  const s = initialScrollState(at(0, 900));
  assert.equal(resolveReaderChrome({ ...base, scroll: s }).dockVisible, false);
});

test("locked chapter, chapter list or preferences open: dock hidden (inert) even if pinned/focused", () => {
  const s = run([0, 2000, 1900, 1800]);
  for (const key of ["locked", "chapterListOpen", "preferencesOpen"]) {
    assert.equal(resolveReaderChrome({ ...base, scroll: s, [key]: true, dockFocused: true, dockPinned: true }).dockVisible, false, key);
  }
});

test("keyboard focus keeps the chrome shown; pinned dock survives until focus lands", () => {
  const hidden = run([0, 600, 1200, 2000]);
  assert.equal(resolveReaderChrome({ ...base, scroll: hidden, toolbarFocused: true }).toolbar, "pinned");
  assert.equal(resolveReaderChrome({ ...base, scroll: hidden, preferencesOpen: true }).toolbar, "pinned", "preferences panel lives in the toolbar");
  assert.equal(resolveReaderChrome({ ...base, scroll: hidden, dockFocused: true }).dockVisible, true);
  assert.equal(resolveReaderChrome({ ...base, scroll: hidden, dockPinned: true }).dockVisible, true);
  assert.equal(resolveReaderChrome({ ...base, scroll: hidden, dockPinned: true, endNavInView: true }).dockVisible, true, "focus return wins over end-nav dedupe");
  assert.equal(resolveReaderChrome({ ...base, scroll: hidden, toolbarPinned: true }).toolbar, "pinned", "focus returning to the preferences toggle");
  assert.equal(resolveReaderChrome({ ...base, scroll: { ...hidden, atTop: true }, toolbarPinned: true }).toolbar, "top");
});

test("no state object churn when nothing visible changes", () => {
  const s = run([0, 2000]);
  const same = nextScrollState(s, at(2000));
  assert.equal(same, s, "identical sample returns the same object");
  const moved = nextScrollState(s, at(2010));
  assert.equal(moved.toolbarHidden, s.toolbarHidden);
  assert.equal(moved.lastY, 2010);
});

test("negative scroll (iOS rubber band) is treated as the top", () => {
  const s = run([0, 2000, -40]);
  assert.equal(s.atTop, true);
  assert.equal(s.toolbarHidden, false);
});
