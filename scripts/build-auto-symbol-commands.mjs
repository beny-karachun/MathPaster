// Extract standalone command names from the bundled renderer and validate every
// candidate in that same renderer. Run when upgrading mathlive.min.js.
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = join(root, 'mathlive/lib/mathlive.min.js');
const source = readFileSync(lib, 'utf8');
const { SYMBOL_CATALOG } = await import('../mathlive/src/symbol-catalog.js');
const { PALETTE_DATA } = await import('../mathlive/src/palette-data.js');
const catalogCommands = [...Object.values(SYMBOL_CATALOG).flat(), ...Object.values(PALETTE_DATA).flat()]
  .flatMap(entry => [...(entry.latex || '').matchAll(/\\([A-Za-z]{2,})/g)].map(m => m[1]));
const commands = [...new Set([...source.matchAll(/\\\\([A-Za-z]{2,})/g)].map(m => m[1]).concat(catalogCommands))].sort();
const chrome = ['google-chrome', 'chromium', 'chromium-browser'].find(bin => {
  try { execFileSync('which', [bin], { stdio: 'ignore' }); return true; } catch { return false; }
});
if (!chrome) throw new Error('Chrome/Chromium is required to validate auto-symbol commands.');
const temp = mkdtempSync(join(tmpdir(), 'mathpaster-auto-symbols-'));
try {
  copyFileSync(lib, join(temp, 'ml.js'));
  writeFileSync(join(temp, 'check.html'), `<!doctype html><meta charset="utf-8"><script src="ml.js"></script><pre id="out"></pre><script>
    const included = {};
    for (const name of ${JSON.stringify(commands)}) {
      const latex = '\\\\' + name;
      try {
        const errors = MathLive.validateLatex(latex);
        const markup = MathLive.convertLatexToMarkup(latex);
        const face = document.createElement('div'); face.innerHTML = markup;
        if (!errors.length && !markup.includes('ML__error') && (face.textContent.trim() || face.querySelector('svg'))) included[name] = latex;
      } catch {}
    }
    document.getElementById('out').textContent = 'RESULT::' + JSON.stringify(included);
  </script>`);
  const dom = execFileSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--dump-dom',
    '--virtual-time-budget=8000', 'file://' + join(temp, 'check.html')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const result = JSON.parse(dom.match(/RESULT::([^<]*)/)[1]);
  if (!Object.keys(result).length) throw new Error('No supported commands found.');
  writeFileSync(join(root, 'mathlive/src/auto-symbol-commands.js'),
    '// Standalone symbol commands validated against the bundled MathLive renderer.\n' +
    '// Regenerate with: node scripts/build-auto-symbol-commands.mjs\n' +
    '// Formatting and structural commands need templates in auto-symbols.js.\n' +
    'export const AUTO_SYMBOL_COMMANDS = ' + JSON.stringify(result, null, 2) + ';\n');
  console.log(`Validated ${Object.keys(result).length} standalone auto-symbol commands.`);
} finally { rmSync(temp, { recursive: true, force: true }); }
