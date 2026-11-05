#!/usr/bin/env node
/*
 * Make web-sized copies of the cutouts for the survey site, sorted by category.
 *
 *   artifact cutout/<name>.png  ->  artifact cutout (web, by category)/<category folder>/<name>.webp
 *
 * 600px on the longest side, transparency kept. Originals are never touched.
 * Which items exist, their files and their categories all come from survey/content
 * (en.js for categories, images.js for file names and category folders), so re-run this
 * after adding a cutout or moving an item to another category.
 *
 *   node tools/make-web-cutouts.js
 *
 * Needs `cwebp` (brew install webp); `sips` is built into macOS.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
global.window = {};
for (const f of ['en.js', 'images.js']) require(path.join(root, 'survey/content', f));
const { en } = window.SURVEY_CONTENT;
const images = window.SURVEY_IMAGES;

const SRC = path.join(root, 'artifact cutout');
const OUT = path.join(root, 'survey', images.base); // base is relative to survey/index.html
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cutouts-'));
let made = 0, moved = 0;
const problems = [];

for (const item of en.items) {
  const webp = images.files[item.id];
  if (!webp) { problems.push(`${item.id}: no entry in images.js`); continue; }
  const folder = images.folders[item.category];
  if (!folder) { problems.push(`${item.id}: no folder for category "${item.category}" in images.js`); continue; }
  const original = path.join(SRC, webp.replace(/\.webp$/, '.png'));
  if (!fs.existsSync(original)) { problems.push(`${item.id}: original not found (${path.basename(original)})`); continue; }

  const dir = path.join(OUT, folder);
  const dest = path.join(dir, webp);
  fs.mkdirSync(dir, { recursive: true });

  // the item moved category: move its existing copy instead of re-encoding
  for (const other of Object.values(images.folders)) {
    const stale = path.join(OUT, other, webp);
    if (other !== folder && fs.existsSync(stale)) {
      if (fs.existsSync(dest)) fs.rmSync(stale);
      else fs.renameSync(stale, dest);
      moved++;
      console.log(`moved   ${webp} -> ${folder}/`);
    }
  }

  if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(original).mtimeMs) continue; // up to date
  const resized = path.join(tmp, 'resized.png');
  execFileSync('sips', ['-Z', '600', original, '--out', resized], { stdio: 'ignore' });
  execFileSync('cwebp', ['-quiet', '-q', '82', '-alpha_q', '90', '-m', '6', resized, '-o', dest]);
  made++;
  console.log(`made    ${folder}/${webp}`);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`done: ${made} made, ${moved} moved${problems.length ? `, ${problems.length} problem(s):` : ''}`);
problems.forEach((p) => console.log(`  - ${p}`));
if (problems.length) process.exitCode = 1;
