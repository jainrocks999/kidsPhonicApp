#!/usr/bin/env node
// Usage: node scripts/find-image-usage.mjs bath   (or bath.webp)
// Shows which lesson vocab step / story / level screen uses an image.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/find-image-usage.mjs <name>   e.g. bath or bath.webp');
  process.exit(1);
}

const name = input.replace(/\.(webp|png|jpe?g)$/i, '').toLowerCase();
const slug = (w) => w.toLowerCase().replace(/[\s-]+/g, '_');
const pad2 = (n) => String(n).padStart(2, '0');

const curriculum = JSON.parse(readFileSync(join(root, 'rn_assets/data/curriculum.json'), 'utf8'));

// 1. Lesson vocab steps: a word whose name (or curriculum image path) matches.
const lessonHits = [];
for (const level of curriculum.levels) {
  for (const unit of level.units) {
    for (const lesson of unit.lessons) {
      const firstWord = lesson.words[0].word;
      lesson.words.forEach((w, i) => {
        const byDisplay = (w.displays ?? []).some(
          (d) => d.type === 'image' && d.path.toLowerCase().includes(name),
        );
        if (slug(w.word) === name || byDisplay) {
          lessonHits.push({
            level: level.id,
            levelNumber: level.number,
            unit: unit.id,
            unitNumber: unit.number,
            lessonId: lesson.id,
            letter: lesson.letter,
            lessonKey: `${level.id}U${pad2(unit.number)}_${lesson.letter}_${slug(firstWord)}`,
            step: i + 1,
            word: w.word,
          });
        }
      });
    }
  }
}

// 2. Every bundled file that mentions the name (stories, level art, audio, etc.).
const registry = readFileSync(join(root, 'src/assets/registry.generated.ts'), 'utf8');
const bundled = [...registry.matchAll(/^\s*"([^"]+)":\s*require/gm)]
  .map((m) => m[1])
  .filter((key) => key.toLowerCase().includes(name));

if (lessonHits.length === 0 && bundled.length === 0) {
  console.log(`"${name}" not found in curriculum or asset registry.`);
  process.exit(0);
}

if (lessonHits.length) {
  console.log(`\nLesson vocab usage for "${name}":`);
  for (const h of lessonHits) {
    console.log(
      `  Level ${h.levelNumber} (${h.level}) > Unit ${h.unitNumber} (${h.unit}) > ` +
        `Lesson ${h.letter} [${h.lessonId}]  -> vocab step ${h.step} "${h.word}"`,
    );
    console.log(`    lesson key: ${h.lessonKey}`);
  }
}

if (bundled.length) {
  console.log(`\nBundled files matching "${name}":`);
  for (const key of bundled) console.log(`  ${key}`);
}
console.log('');
