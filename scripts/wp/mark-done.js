#!/usr/bin/env node
/**
 * mark-done.js
 *
 * Updates stories_master_tracker.json to mark a story as completed.
 *
 * Usage:
 *   node scripts/wp/mark-done.js <STORY_CODE>
 *
 * Example:
 *   node scripts/wp/mark-done.js TT2D683
 */

const fs = require('fs');
const path = require('path');

// Path to the tracker JSON (relative to repository root)
const TRACKER_PATH = path.resolve(__dirname, '../../stories_master_tracker.json');

const storyCode = process.argv[2];
if (!storyCode) {
  console.error('Error: story code required (e.g., TT2D683)');
  process.exit(1);
}

// Load existing tracker or start a new one
let tracker = { stories: {} };
if (fs.existsSync(TRACKER_PATH)) {
  try {
    tracker = JSON.parse(fs.readFileSync(TRACKER_PATH, 'utf8'));
  } catch (e) {
    console.error('Failed to parse existing tracker JSON:', e);
    process.exit(1);
  }
}

// Update the story entry
const now = new Date().toISOString();
tracker.stories[storyCode] = {
  is_done: true,
  completed_at: now,
};

// Write back to disk (pretty‑printed)
fs.writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2) + '\n', 'utf8');
console.log(`✔ Marked ${storyCode} as done (updated ${path.basename(TRACKER_PATH)})`);
process.exit(0);
