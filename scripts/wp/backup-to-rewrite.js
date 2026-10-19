#!/usr/bin/env node
/**
 * backup-to-rewrite.js
 *
 * Converts a backup-ttXXXX.json (produced by apply-single-story.php --apply)
 * into a rewrite-ttXXXX.json that can be fed back into apply-single-story.php
 * to restore / re-apply the original content.
 *
 * Backup format (from apply-single-story.php):
 *   {
 *     "<chapter_id>": {
 *       "story_id": "...",
 *       "chapter_id": <number>,
 *       "order": <number>,
 *       "title": "...",
 *       "post_content": "..."
 *     }, ...
 *   }
 *
 * Rewrite format expected by apply-single-story.php:
 *   {
 *     "<story_code>": {
 *       "story_id": <number>,
 *       "code": "<story_code>",
 *       "updates": [
 *         { "chapter_id": <number>, "order": <number>, "content": "..." },
 *         ...
 *       ]
 *     }
 *   }
 *
 * Usage:
 *   node backup-to-rewrite.js <backup-ttXXXX.json> [<story_code>]
 *
 * Example:
 *   node backup-to-rewrite.js backup-tt2d679.json TT2D679
 *   → writes rewrite-tt2d679.json in the same directory
 */

const fs = require('fs');
const path = require('path');

const backupFile = process.argv[2];
const storyCodeArg = process.argv[3];

if (!backupFile || !fs.existsSync(backupFile)) {
  console.error('Error: provide a valid backup JSON file path.');
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
const entries = Object.values(backup);

if (!entries.length) {
  console.error('Error: backup file is empty.');
  process.exit(1);
}

// Derive story info from first entry
const storyId = parseInt(entries[0].story_id, 10);
const storyCode = (storyCodeArg || ('tt2d' + storyId)).toUpperCase();
const codeSlug = storyCode.toLowerCase();

// Build updates array (only chapters with order >= 2, per project rules)
const updates = entries
  .filter(e => parseInt(e.order, 10) >= 2)
  .sort((a, b) => parseInt(a.order, 10) - parseInt(b.order, 10))
  .map(e => ({
    chapter_id: parseInt(e.chapter_id, 10),
    order: parseInt(e.order, 10),
    content: e.post_content,
  }));

if (!updates.length) {
  console.error('Error: no chapters with order >= 2 found in backup.');
  process.exit(1);
}

const rewrite = {
  [storyCode]: {
    story_id: storyId,
    code: codeSlug,
    updates,
  },
};

const outFile = path.join(path.dirname(backupFile), `rewrite-${codeSlug}.json`);
fs.writeFileSync(outFile, JSON.stringify(rewrite, null, 2), 'utf8');
console.log(`✔ Written ${updates.length} chapters → ${outFile}`);
