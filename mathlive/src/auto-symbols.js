import { AUTO_SYMBOL_COMMANDS } from './auto-symbol-commands.js';
import { SYMBOL_CATALOG } from './symbol-catalog.js';
import { PALETTE_DATA } from './palette-data.js';

// Keep MathLive's familiar aliases and templates, while covering every supported
// standalone command by its exact, case-sensitive name (without the backslash).
export function buildAutoSymbols(defaults = {}) {
  const shortcuts = { ...defaults };
  for (const [name, latex] of Object.entries(AUTO_SYMBOL_COMMANDS)) {
    const existing = typeof shortcuts[name] === 'string' ? shortcuts[name] : shortcuts[name]?.value;
    if (!existing || !new RegExp('^\\\\' + name + '(?![A-Za-z])').test(existing)) shortcuts[name] = latex;
  }

  // Parameterized symbols need editable slots rather than an incomplete command.
  const templates = {
    frac: '\\frac{#?}{#?}', dfrac: '\\dfrac{#?}{#?}', tfrac: '\\tfrac{#?}{#?}',
    cfrac: '\\cfrac{#?}{#?}', binom: '\\binom{#?}{#?}', dbinom: '\\dbinom{#?}{#?}', tbinom: '\\tbinom{#?}{#?}',
    sqrt: '\\sqrt{#?}', overset: '\\overset{#?}{#?}', underset: '\\underset{#?}{#?}', stackrel: '\\stackrel{#?}{#?}',
  };
  for (const name of ['vec', 'bar', 'hat', 'widehat', 'tilde', 'widetilde', 'dot', 'ddot', 'dddot',
    'overline', 'underline', 'overbrace', 'underbrace', 'overrightarrow', 'overleftarrow',
    'overleftrightarrow', 'underrightarrow', 'underleftarrow', 'underleftrightarrow',
    'boxed', 'mathbb', 'mathcal', 'mathfrak', 'mathscr', 'mathbf', 'mathrm', 'mathit', 'mathsf', 'mathtt']) {
    templates[name] = `\\${name}{#?}`;
  }
  Object.assign(shortcuts, templates);

  // Named operators in palettes/catalogs use \operatorname{...} in LaTeX.
  for (const entry of [...Object.values(SYMBOL_CATALOG).flat(), ...Object.values(PALETTE_DATA).flat()]) {
    const name = /^\\operatorname\{([A-Za-z]+)\}/.exec(entry.latex || '')?.[1];
    if (!name) continue;
    const latex = `\\operatorname{${name}}`;
    shortcuts[name] ??= latex;
    shortcuts[name.toLowerCase()] ??= latex;
  }

  // These capitals share Latin glyphs in standard LaTeX, but should still be
  // reachable by their Greek names, just like Gamma/Delta/etc.
  Object.assign(shortcuts, {
    Alpha: 'A', Beta: 'B', Epsilon: 'E', Zeta: 'Z', Eta: 'H', Iota: 'I',
    Kappa: 'K', Mu: 'M', Nu: 'N', Omicron: 'O', Rho: 'P', Tau: 'T', Chi: 'X',
  });
  return shortcuts;
}
