export const exercises = [
  {
    title: 'A matrix', short: 'Matrix',
    instruction: 'Write this 2 × 2 matrix with square brackets.',
    latex: String.raw`\begin{bmatrix}1&2\\3&4\end{bmatrix}`,
    words: 'A two-by-two matrix with square brackets, with one and two in the first row, and three and four in the second row.',
    hint: 'Open Linear Algebra, choose [ ], and select a 2 × 2 matrix. Fill the cells with 1, 2, 3, and 4; use the arrow keys to move between cells.'
  },
  {
    title: 'A definite integral', short: 'Integral',
    instruction: 'Write the integral, including its bounds and dx.',
    latex: String.raw`\int_0^1 x^2\,dx`,
    words: 'The definite integral from zero to one of x squared, with respect to x.',
    hint: 'In Calculus, choose the integral with upper and lower bounds. Set the lower bound to 0 and the upper bound to 1, then enter x squared followed by dx.'
  },
  {
    title: 'A nested expression', short: 'Fraction',
    instruction: 'Put the whole square root in the denominator.',
    latex: String.raw`\frac{x+1}{\sqrt{x^2+1}}`,
    words: 'A fraction whose numerator is x plus one and whose denominator is the square root of the entire expression x squared plus one.',
    hint: 'Choose the fraction in Common. Type x+1 in the top slot, move down, choose the square root, and type x^2+1 inside it.'
  },
  {
    title: 'A sum with bounds', short: 'Sum',
    instruction: 'Write the sum of k squared from k = 1 to n.',
    latex: String.raw`\sum_{k=1}^{n} k^2`,
    words: 'The sum of k squared over all integer values of k starting at one and ending at n, inclusive.',
    hint: 'In Calculus, choose the summation symbol with bounds. Enter k=1 below and n above, then write k squared to its right.'
  },
  {
    title: 'A limit', short: 'Limit',
    instruction: 'Write this limit with the fraction after it.',
    latex: String.raw`\lim_{x\to0}\frac{\sin x}{x}`,
    alternatives: [String.raw`\lim_{x\to0}\frac{\sin(x)}{x}`],
    words: 'The limit, as x approaches zero, of the fraction with the sine of x in the numerator and x in the denominator.',
    hint: 'Choose lim in Calculus. Put x → 0 below it. Move out of the subscript, add a fraction, and write sin x over x.'
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
