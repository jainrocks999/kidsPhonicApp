// Generates src/data/licenses.generated.json — every runtime (non-dev) npm package shipped in
// the app with its version and license, for Settings → Open Source Licenses.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const pkgJson = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));

/** Node-style lookup of `name` starting from `fromDir`. */
function locate(name, fromDir) {
  for (let dir = fromDir; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) return candidate;
    if (dir === ROOT || dir === '/') return null;
  }
}

const seen = new Map();
const queue = Object.keys(pkgJson(ROOT).dependencies ?? {}).map((n) => [n, ROOT]);
while (queue.length) {
  const [name, from] = queue.shift();
  const dir = locate(name, from);
  if (!dir || seen.has(dir)) continue;
  const p = pkgJson(dir);
  const license = typeof p.license === 'string' ? p.license : (p.license?.type ?? p.licenses?.[0]?.type ?? 'UNKNOWN');
  seen.set(dir, { name: p.name, version: p.version, license });
  for (const dep of Object.keys(p.dependencies ?? {})) queue.push([dep, dir]);
}

const list = [...new Map([...seen.values()].map((l) => [`${l.name}@${l.version}`, l])).values()].sort((a, b) =>
  a.name.localeCompare(b.name),
);
writeFileSync(join(ROOT, 'src/data/licenses.generated.json'), JSON.stringify(list, null, 1) + '\n');
console.log(`licenses: ${list.length} packages`);
