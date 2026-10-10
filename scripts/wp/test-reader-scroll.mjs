// Unit tests for the reader toolbar/dock logic (reader-core.js). Since 2026-10-10 both stay within reach: the
// toolbar never hides, the dock shows from the start until the end-of-chapter navigation is on screen.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SCROLL_CONFIG as C, initialScrollState, nextScrollState, resolveReaderChrome } from "../../wp-content/themes/thu-cac/assets/js/reader-core.js";

const at = (y) => ({ y });
/** Feeds a list of scroll positions, one per frame. */
function run(positions) {
  let state = initialScrollState(at(positions[0]));
  for (const y of positions.slice(1)) state = nextScrollState(state, at(y));
  return state;
}
const base = { endNavInView: false, locked: false, chapterListOpen: false, preferencesOpen: false, dockFocused: false, dockPinned: false };

test("page just opened: toolbar at the top, dock already visible", () => {
  const s = initialScrollState(at(0));
  assert.equal(s.atTop, true);
  assert.deepEqual(resolveReaderChrome({ ...base, scroll: s }), { toolbar: "top", dockVisible: true });
});

test("scrolling down keeps both: toolbar pinned, dock visible", () => {
  const s = run([0, 100, 300, 600, 900, 2000]);
  assert.equal(s.atTop, false);
  assert.deepEqual(resolveReaderChrome({ ...base, scroll: s }), { toolbar: "pinned", dockVisible: true });
});

test("scrolling back up changes nothing until the top zone", () => {
  const up = run([0, 2000, 1950, 1000, C.topZone + 1]);
  assert.deepEqual(resolveReaderChrome({ ...base, scroll: up }), { toolbar: "pinned", dockVisible: true });
  const top = run([0, 2000, 1000, 400, C.topZone]);
  assert.equal(top.atTop, true);
  assert.equal(resolveReaderChrome({ ...base, scroll: top }).toolbar, "top");
});

test("the toolbar is never hidden, whatever the state", () => {
  for (const scroll of [run([0]), run([0, 5000])]) {
    for (const key of ["locked", "chapterListOpen", "preferencesOpen", "endNavInView"]) {
      assert.notEqual(resolveReaderChrome({ ...base, scroll, [key]: true }).toolbar, "hidden", key);
    }
  }
});

test("end navigation on screen hides the dock (no duplicate navigation), also on a short chapter at the top", () => {
  assert.equal(resolveReaderChrome({ ...base, scroll: run([0, 3000]), endNavInView: true }).dockVisible, false);
  assert.equal(resolveReaderChrome({ ...base, scroll: initialScrollState(at(0)), endNavInView: true }).dockVisible, false);
});

test("locked chapter, chapter list or preferences open: dock hidden (inert) even if pinned/focused", () => {
  const s = run([0, 2000]);
  for (const key of ["locked", "chapterListOpen", "preferencesOpen"]) {
    assert.equal(resolveReaderChrome({ ...base, scroll: s, [key]: true, dockFocused: true, dockPinned: true }).dockVisible, false, key);
  }
});

test("focus returning to a dock button wins over the end-nav rule", () => {
  const s = run([0, 2000]);
  assert.equal(resolveReaderChrome({ ...base, scroll: s, endNavInView: true, dockPinned: true }).dockVisible, true);
  assert.equal(resolveReaderChrome({ ...base, scroll: s, endNavInView: true, dockFocused: true }).dockVisible, true);
});

test("no state object churn when nothing visible changes", () => {
  const s = run([0, 2000]);
  assert.equal(nextScrollState(s, at(2000)), s, "identical sample returns the same object");
  const moved = nextScrollState(s, at(2010));
  assert.equal(moved.atTop, false);
  assert.equal(moved.lastY, 2010);
});

test("negative scroll (iOS rubber band) is treated as the top", () => {
  const s = run([0, 2000, -40]);
  assert.equal(s.atTop, true);
});
