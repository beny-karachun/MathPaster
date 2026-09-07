export const exercises = [
  {
    title: 'A matrix', short: 'Matrix',
    instruction: 'Write this 2 × 2 matrix with square brackets.',
    latex: String.raw`\begin{bmatrix}1&2\\3&4\end{bmatrix}`,
    words: 'A two-by-two matrix with square brackets, with one and two in the first row, and three and four in the second row.',
    effort: 'In words, you have to describe the brackets, dimensions, row order and every entry. In the editor, choose the shape once and fill four cells—less typing and less checking that the rows are unambiguous.',
    hint: 'Open Linear Algebra, choose [ ], and select a 2 × 2 matrix. Fill the cells with 1, 2, 3, and 4; use the arrow keys to move between cells.'
  },
  {
    title: 'A definite integral', short: 'Integral',
    instruction: 'Write the integral, including its bounds and dx.',
    latex: String.raw`\int_0^1 x^2\,dx`,
    words: 'The definite integral from zero to one of x squared, with respect to x.',
    effort: 'Writing this out means spelling out both bounds, the power and the variable of integration. A three-letter shortcut creates the integral template; fill its slots and see immediately what each bound belongs to.',
    hint: String.raw`Keep Auto-Symbols on and type int to create an integral with bound slots. Fill 0 below and 1 above; Tab moves between empty slots. Move to the right of the integral and type x^2, then leave the exponent with → and type dx. Alternative: type \int and press Enter to accept the command; use _ and ^ to add bounds.`
  },
  {
    title: 'A nested expression', short: 'Fraction',
    instruction: 'Put the whole square root in the denominator.',
    latex: String.raw`\frac{x+1}{\sqrt{x^2+1}}`,
    words: 'A fraction whose numerator is x plus one and whose denominator is the square root of the entire expression x squared plus one.',
    effort: 'The sentence needs extra explanation to say where the numerator ends and what is inside the root. The fraction and root make that grouping visible, saving the effort of writing and rereading those qualifications.',
    hint: String.raw`Choose a fraction in Common and type x+1 in the top slot. Move to the bottom slot. With Auto-Symbols on, type sqrt to create a root instantly. Type x^2, press → to leave the exponent, then +1 inside the root. Alternative: type \sqrt and press Enter to insert the root template.`
  },
  {
    title: 'A sum with bounds', short: 'Sum',
    instruction: 'Write the sum of k squared from k = 1 to n.',
    latex: String.raw`\sum_{k=1}^{n} k^2`,
    words: 'The sum of k squared over all integer values of k starting at one and ending at n, inclusive.',
    effort: 'In words, you must explain the index, starting value, ending value and what gets squared. Type sum to get the structure, then fill the bounds—no sentence to compose or qualifiers to double-check.',
    hint: String.raw`With Auto-Symbols on, type sum to get a summation with bound slots. Fill k=1 below and n above, using Tab between empty slots. Move to the right of the sum and type k^2. Alternative: type \sum and press Enter; use _ and ^ for the bounds.`
  },
  {
    title: 'A limit', short: 'Limit',
    instruction: 'Write this limit with the fraction after it.',
    latex: String.raw`\lim_{x\to0}\frac{\sin x}{x}`,
    alternatives: [String.raw`\lim_{x\to0}\frac{\sin(x)}{x}`],
    words: 'The limit, as x approaches zero, of the fraction with the sine of x in the numerator and x in the denominator.',
    effort: 'The written description has to explain both the approach to zero and the fraction. The notation shows these relationships at a glance, reducing both typing and the work of checking your wording.',
    hint: String.raw`Type \lim and press Enter, then _ to enter the subscript. With Auto-Symbols on, type x->0 to get x → 0. Move out of the subscript, insert a fraction, and type sin x above and x below. You can also type \sin and press Enter; backslash commands work even when Auto-Symbols is off.`
  }
];

// Compare notation, not arbitrary mathematical equivalence. Ignore formatting
// differences MathLive commonly generates, while preserving operands and bounds.
export function normalizeLatex(value) {
  return String(value).trim()
    .replace(/^\${1,2}|\${1,2}$/g, '')
    .replace(/\\(?:left|right)\b/g, '')
    .replace(/\\(?:dfrac|tfrac)\b/g, '\\frac')
    .replace(/\\(?:mathrm|operatorname)\{(d|sin)\}/g, (_, s) => s === 'sin' ? '\\sin' : 'd')
    .replace(/\\differentialD\b/g, 'd')
    .replace(/\\(?:rightarrow|longrightarrow)\b/g, '\\to')
    .replace(/(?<!\\)\\(?:,|;|!|:| |quad\b|qquad\b|enspace\b|thinspace\b)/g, '')
    .replace(/\s+/g, '')
    .replace(/\{([a-zA-Z0-9])\}/g, '$1')
    .replace(/\^(\{[^{}]*\}|[a-zA-Z0-9])_(\{[^{}]*\}|[a-zA-Z0-9])/g, '_$2^$1');
}
export function matchesExercise(value, exercise) {
  const answer = normalizeLatex(value);
  return [exercise.latex, ...(exercise.alternatives || [])].some(target => normalizeLatex(target) === answer);
}
