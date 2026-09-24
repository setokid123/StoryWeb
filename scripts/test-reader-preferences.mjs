// Unit tests for the reader preferences model (validation, legacy migration, persistence format, body styles).
//   node --experimental-strip-types --no-warnings scripts/test-reader-preferences.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyReaderPreferenceUpdate,
  DEFAULT_READER_PREFERENCES as D,
  parseReaderPreferences as parse,
  readerBodyStyle,
  serializeReaderPreferences as serialize,
} from "../src/lib/reader-preferences.ts";

test("nothing stored → defaults", () => {
  assert.deepEqual(parse(null, null), D);
});

test("legacy storyweb:font-size migrates when the new key is missing", () => {
  assert.equal(parse(null, "22").fontSize, 22);
  assert.equal(parse(null, " 16 ").fontSize, 16);
  for (const bad of ["15", "27", "abc", "", "19.5", "1e1", "-20", "999"]) assert.equal(parse(null, bad).fontSize, D.fontSize, `legacy ${bad}`);
});

test("new key wins over legacy value", () => {
  assert.equal(parse(serialize({ ...D, fontSize: 18 }), "25").fontSize, 18);
});

test("round trip keeps every field", () => {
  const prefs = { fontFamily: "inter", fontWeight: "bold", fontSize: 24, lineHeight: "loose", columnWidth: "narrow", textAlignment: "left" };
  assert.deepEqual(parse(serialize(prefs)), prefs);
  assert.equal(JSON.parse(serialize(prefs)).v, 1);
});

test("broken JSON, wrong shape or unknown version → safe defaults", () => {
  for (const raw of ["{", "null", "[]", "42", "\"x\"", JSON.stringify({ v: 2, fontSize: 24 }), JSON.stringify({ fontSize: 24 })]) {
    assert.deepEqual(parse(raw), D, raw);
  }
});

test("invalid fields fall back one by one, valid ones are kept", () => {
  const raw = JSON.stringify({ v: 1, fontFamily: "comic-sans", fontWeight: "bold", fontSize: 99, lineHeight: 3, columnWidth: "wide", textAlignment: "center", theme: "dark", extra: "<script>" });
  assert.deepEqual(parse(raw), { ...D, fontWeight: "bold", columnWidth: "wide" });
  for (const size of [15, 27, 19.5, "20", null, Number.NaN]) assert.equal(parse(JSON.stringify({ v: 1, fontSize: size })).fontSize, D.fontSize, String(size));
});

test("updates are validated; font size is clamped to 16–26", () => {
  let p = applyReaderPreferenceUpdate(D, { fontFamily: "inter", lineHeight: "tight" });
  assert.equal(p.fontFamily, "inter");
  assert.equal(p.lineHeight, "tight");
  p = applyReaderPreferenceUpdate(p, { fontFamily: "papyrus", columnWidth: 7, textAlignment: "right" });
  assert.equal(p.fontFamily, "inter");
  assert.equal(p.columnWidth, D.columnWidth);
  assert.equal(p.textAlignment, D.textAlignment);
  assert.equal(applyReaderPreferenceUpdate(D, { fontSize: 40 }).fontSize, 26);
  assert.equal(applyReaderPreferenceUpdate(D, { fontSize: 3 }).fontSize, 16);
  assert.equal(applyReaderPreferenceUpdate(D, { fontSize: 20.6 }).fontSize, 21);
  assert.equal(applyReaderPreferenceUpdate(D, { fontSize: "big" }).fontSize, D.fontSize);
  assert.equal(D.fontSize, 19, "defaults are never mutated");
});

test("body style maps every choice and only targets the chapter body", () => {
  const s = readerBodyStyle({ fontFamily: "inter", fontWeight: "bold", fontSize: 24, lineHeight: "loose", columnWidth: "narrow", textAlignment: "left" });
  assert.deepEqual(s.body, { fontFamily: "var(--sans)", fontWeight: 600, fontSize: "24px", lineHeight: 2.2, maxWidth: "560px", marginInline: "auto" });
  assert.deepEqual(s.paragraph, { textAlign: "left" });
  assert.equal(s.dataAttributes["data-pref-width"], "narrow");
  const d = readerBodyStyle(D);
  assert.equal(d.body.fontFamily, "var(--serif)");
  assert.equal(d.body.lineHeight, 1.9, "default matches the previous reader line-height");
  assert.equal(d.paragraph.textAlign, "justify", "default matches the previous justified text");
});
