"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  applyReaderPreferenceUpdate,
  DEFAULT_READER_PREFERENCES,
  LEGACY_FONT_SIZE_KEY,
  parseReaderPreferences,
  READER_PREFS_EVENT,
  READER_PREFS_KEY,
  serializeReaderPreferences,
  type StoredReaderPreferences,
} from "@/lib/reader-preferences";

// localStorage can throw (private mode, blocked storage): every access is guarded and falls back to defaults.
function readStorage(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

let cached: { signature: string; value: StoredReaderPreferences } | null = null;

/** Returns the same object while the stored strings are unchanged (required by useSyncExternalStore). */
function getSnapshot(): StoredReaderPreferences {
  const raw = readStorage(READER_PREFS_KEY);
  const legacy = raw === null ? readStorage(LEGACY_FONT_SIZE_KEY) : null;
  const signature = `${raw}\u0000${legacy}`;
  if (!cached || cached.signature !== signature) cached = { signature, value: parseReaderPreferences(raw, legacy) };
  return cached.value;
}

/** Server and first client render use defaults, so SSR and hydration match; stored values apply right after. */
function getServerSnapshot(): StoredReaderPreferences {
  return DEFAULT_READER_PREFERENCES;
}

function subscribe(callback: () => void) {
  // "storage" fires in other tabs → preferences stay in sync across tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === READER_PREFS_KEY || event.key === LEGACY_FONT_SIZE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(READER_PREFS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(READER_PREFS_EVENT, callback);
  };
}

function persist(prefs: StoredReaderPreferences) {
  try {
    window.localStorage.setItem(READER_PREFS_KEY, serializeReaderPreferences(prefs));
    window.localStorage.removeItem(LEGACY_FONT_SIZE_KEY);
  } catch {
    // Storage unavailable: the change is lost on reload, but the page keeps working.
  }
  window.dispatchEvent(new Event(READER_PREFS_EVENT));
}

export function useReaderPreferences() {
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // One-time upgrade: copy the old "storyweb:font-size" into the versioned key, then drop the old key.
  useEffect(() => {
    if (readStorage(READER_PREFS_KEY) !== null) return;
    if (readStorage(LEGACY_FONT_SIZE_KEY) !== null) persist(getSnapshot());
  }, []);

  const update = useCallback((updates: Partial<StoredReaderPreferences>) => {
    persist(applyReaderPreferenceUpdate(getSnapshot(), updates));
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(READER_PREFS_KEY);
      window.localStorage.removeItem(LEGACY_FONT_SIZE_KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(READER_PREFS_EVENT));
  }, []);

  return { preferences, update, reset };
}
