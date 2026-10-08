import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findReactEntryProblems } from './lib/react-entry-check.mjs';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const read = (name) => readFileSync(resolve(dist, name), 'utf8');

const problems = findReactEntryProblems({
  iife: read('checkout-button.js'),
  reactEsm: read('react.mjs'),
  reactCjs: read('react.cjs'),
  reactDts: read('react.d.ts'),
});

if (problems.length > 0) {
  for (const problem of problems) console.error(`[react-entry-check] ${problem}`);
  process.exit(1);
}
console.log('[react-entry-check] PASS — React entry imports the core, CDN bundle has no React.');
