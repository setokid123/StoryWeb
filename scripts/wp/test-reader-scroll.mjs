// Unit tests for the reader toolbar/dock logic (reader-core.js), in both toolbar modes the reader can choose:
// "pinned" (default: everything stays within reach) and "auto" ("Không ghim": the top bars hide on the way down and
// come back on the way up; the dock stays pinned in both).
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SCROLL_CONFIG as C, initialScrollState, nextScrollState, resolveReaderChrome } from "../../wp-content/themes/thu-cac/assets/js/reader-core.js";

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
const pinned = { ...base, mode: "pinned" };
const auto = { ...base, mode: "auto" };

// ---------- "pinned" (default) ----------

test("pinned: page just opened → toolbar at the top, dock already visible", () => {
  assert.deepEqual(resolveReaderChrome({ ...pinned, scroll: initialScrollState(at(0)) }), { toolbar: "top", dockVisible: true });
  assert.deepEqual(resolveReaderChrome({ ...base, scroll: initialScrollState(at(0)) }), { toolbar: "top", dockVisible: true }, "no mode = pinned");
});

test("pinned: as soon as the page moves the toolbar is 'pinned' (veil on); scrolling never hides anything", () => {
  assert.equal(run([0, C.movedAfter]).moved, false);
  assert.equal(resolveReaderChrome({ ...pinned, scroll: run([0, C.movedAfter + 1]) }).toolbar, "pinned");
  for (const s of [run([0, 300, 900, 2000]), run([0, 2000, 1950, 1000])]) {
    assert.deepEqual(resolveReaderChrome({ ...pinned, scroll: s }), { toolbar: "pinned", dockVisible: true });
  }
  assert.equal(resolveReaderChrome({ ...pinned, scroll: run([0, 2000, 0]) }).toolbar, "top");
});

test("pinned: end navigation on screen hides the dock, also on a short chapter at the top", () => {
  assert.equal(resolveReaderChrome({ ...pinned, scroll: run([0, 3000]), endNavInView: true }).dockVisible, false);
  assert.equal(resolveReaderChrome({ ...pinned, scroll: initialScrollState(at(0, 900)), endNavInView: true }).dockVisible, false);
});

// ---------- "auto" ("Không ghim"): only the top bars hide, the dock stays pinned ----------

test("auto: at the top the toolbar is in place and the dock already visible", () => {
  assert.deepEqual(resolveReaderChrome({ ...auto, scroll: initialScrollState(at(0)) }), { toolbar: "top", dockVisible: true });
});

test("auto: scrolling down hides the toolbar but never the dock", () => {
  const s = run([0, 100, 300, 600, 900]);
  assert.equal(s.toolbarHidden, true);
  assert.deepEqual(resolveReaderChrome({ ...auto, scroll: s }), { toolbar: "hidden", dockVisible: true });
});

test("auto: scrolling up far enough shows the toolbar; small jitter does not flicker", () => {
  const jitter = run([0, 600, 1200, 2000, 1990, 1995, 1985, 1992, 2000 - C.showAfter + 1]);
  assert.equal(jitter.toolbarHidden, true, "less than showAfter upward travel keeps it hidden");
  const up = run([0, 600, 1200, 2000, 1980, 1950, 2000 - C.showAfter]);
  assert.deepEqual(resolveReaderChrome({ ...auto, scroll: up }), { toolbar: "pinned", dockVisible: true });
  assert.equal(run([0, 600, 1200, 2000, 1900, 1900 + C.hideAfter - 1]).toolbarHidden, false, "a few pixels back down do not hide again");
  assert.equal(run([0, 600, 1200, 2000, 1900, 1900 + C.hideAfter]).toolbarHidden, true);
});

test("auto: travel is measured from where the direction changed, not per frame", () => {
  const steps = [0, 3000];
  for (let y = 2998; y >= 3000 - C.showAfter; y -= 2) steps.push(y);
  assert.equal(run(steps).toolbarHidden, false);
});

test("auto: back at the top the toolbar is in place; the end navigation still hides the dock", () => {
  assert.equal(resolveReaderChrome({ ...auto, scroll: run([0, 2000, 1000, 400, 50]) }).toolbar, "top");
  assert.equal(resolveReaderChrome({ ...auto, scroll: run([0, 2000, 5000]), endNavInView: true }).dockVisible, false);
});

test("auto: keyboard focus and the preferences panel keep the toolbar", () => {
  const hidden = run([0, 600, 1200, 2000]);
  assert.equal(resolveReaderChrome({ ...auto, scroll: hidden, toolbarFocused: true }).toolbar, "pinned");
  assert.equal(resolveReaderChrome({ ...auto, scroll: hidden, preferencesOpen: true }).toolbar, "pinned");
  assert.equal(resolveReaderChrome({ ...auto, scroll: hidden, toolbarPinned: true }).toolbar, "pinned");
  assert.equal(resolveReaderChrome({ ...auto, scroll: hidden, dockPinned: true, endNavInView: true }).dockVisible, true, "focus return wins over the end-nav rule");
});

// ---------- both ----------

test("locked chapter, chapter list or preferences open: dock hidden (inert) in both modes, even if pinned/focused", () => {
  const s = run([0, 2000, 1900, 1800]);
  for (const mode of [pinned, auto]) {
    for (const key of ["locked", "chapterListOpen", "preferencesOpen"]) {
      assert.equal(resolveReaderChrome({ ...mode, scroll: s, [key]: true, dockFocused: true, dockPinned: true }).dockVisible, false, `${mode.mode} ${key}`);
    }
  }
});

test("no state object churn when nothing visible changes", () => {
  const s = run([0, 2000]);
  assert.equal(nextScrollState(s, at(2000)), s, "identical sample returns the same object");
  const moved = nextScrollState(s, at(2010));
  assert.equal(moved.toolbarHidden, s.toolbarHidden);
  assert.equal(moved.lastY, 2010);
});

test("negative scroll (iOS rubber band) is treated as the top", () => {
  const s = run([0, 2000, -40]);
  assert.equal(s.atTop, true);
  assert.equal(s.moved, false);
  assert.equal(s.toolbarHidden, false);
});
