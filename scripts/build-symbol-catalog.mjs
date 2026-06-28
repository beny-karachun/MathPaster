#!/usr/bin/env node
// Regenerate mathlive/src/symbol-catalog.js from scripts/symbol-candidates.json.
//
// Each candidate is rendered through the *bundled* MathLive (headless Chrome) and any
// command that produces ML__error markup is dropped — so the shipped catalog can never
// contain a symbol the renderer doesn't support. Run after editing the candidate list:
//
//   node scripts/build-symbol-catalog.mjs
//
// Requires google-chrome (or chromium) on PATH.
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIB = join(ROOT, 'mathlive', 'lib', 'mathlive.min.js');
const OUT = join(ROOT, 'mathlive', 'src', 'symbol-catalog.js');
const MLVER = '0.103.0';

const cand = JSON.parse(readFileSync(join(ROOT, 'scripts', 'symbol-candidates.json'), 'utf8'));

// Normalize entries -> {cat, latex, name}, deduping latex within a category.
const norm = [];
for (const [cat, list] of Object.entries(cand)) {
  const seen = new Set();
  for (const e of list) {
    const [latex, name] = typeof e === 'string' ? ['\\' + e, e] : e;
    if (seen.has(latex)) continue;
    seen.add(latex);
    norm.push({ cat, latex, name });
  }
}

// Render every candidate in headless Chrome; collect the ones that error.
const tmp = mkdtempSync(join(tmpdir(), 'symcat-'));
copyFileSync(LIB, join(tmp, 'ml.js'));
const page = `<!doctype html><meta charset="utf-8"><script src="ml.js"><\/script><pre id="o"></pre><script>
const list=${JSON.stringify(norm)},ML=window.MathLive,errs=[];
for(const it of list){const p=String(it.latex).replace(/#(\\?|@|\\d+)/g,"\\\\placeholder{}");
let m='';try{m=ML.convertLatexToMarkup(p)}catch(e){m='ML__error'}
if(!m||m.includes('ML__error'))errs.push(it.latex)}
document.getElementById('o').textContent='RESULT::'+JSON.stringify(errs);<\/script>`;
writeFileSync(join(tmp, 'v.html'), page);

const bin = ['google-chrome', 'chromium', 'chromium-browser'].find(b => {
  try { execFileSync('which', [b], { stdio: 'ignore' }); return true; } catch { return false; }
});
if (!bin) { console.error('No chrome/chromium on PATH — cannot validate.'); process.exit(1); }
const dom = execFileSync(bin, ['--headless=new', '--no-sandbox', '--disable-gpu', '--dump-dom',
  '--virtual-time-budget=8000', 'file://' + join(tmp, 'v.html')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const errs = new Set(JSON.parse(dom.match(/RESULT::([^<]*)/)[1]));

// Emit grouped module.
const byCat = {};
let kept = 0;
for (const it of norm) { if (errs.has(it.latex)) continue; (byCat[it.cat] ||= []).push(it); kept++; }
let body = '';
for (const [cat, items] of Object.entries(byCat)) {
  body += `  ${JSON.stringify(cat)}: [\n`;
  for (const it of items) body += `    { latex: ${JSON.stringify(it.latex)}, name: ${JSON.stringify(it.name)} },\n`;
  body += `  ],\n`;
}
const out = `// Categorized, render-safe symbol catalog for the "Browse symbols" picker.
//
// Every entry below was validated against the bundled MathLive ${MLVER} by rendering
// it through convertLatexToMarkup and confirming it produces no ML__error markup.
// ${kept} symbols across ${Object.keys(byCat).length} categories. Do NOT hand-add unicode-math
// exotica (e.g. \\\\varhexagon, \\\\smiley) — MathLive doesn't define them and they render
// as red error boxes. Regenerate via: node scripts/build-symbol-catalog.mjs
//
// \`latex\` is inserted/rendered as-is (\`#0\` placeholders handled by renderSymbolFace).
// \`name\` is the search key (space-separated keywords).
export const SYMBOL_CATALOG = {
${body}};
`;
writeFileSync(OUT, out);
console.log(`Wrote ${OUT}: ${kept}/${norm.length} symbols kept, ${errs.size} dropped.`);
if (errs.size) console.log('Dropped:', [...errs].join(' '));
