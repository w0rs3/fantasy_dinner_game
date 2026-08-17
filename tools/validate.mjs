import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['.git', '.idea', 'tmp', 'node_modules'].includes(entry.name)) continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(full));
    else files.push(full);
  }
  return files;
}

run(['--test']);
run(['./tools/simulate.mjs']);

const files = await collect(root);
const sourceFiles = files.filter((file) => ['.js', '.mjs', '.html', '.css'].includes(extname(file)));
const unfinishedMarkers = ['TO' + 'DO', 'FIX' + 'ME', 'PLACE' + 'HOLDER'];
for (const file of sourceFiles) {
  const text = await readFile(file, 'utf8');
  if (unfinishedMarkers.some((marker) => text.includes(marker))) {
    console.error(`Unfinished marker found in ${file}`);
    process.exit(1);
  }
}

console.log(`Release validation passed: ${sourceFiles.length} source files checked.`);
