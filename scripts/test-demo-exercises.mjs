import assert from 'node:assert/strict';
import {exercises, matchesExercise} from '../docs/demo-exercise-data.js';
for (const exercise of exercises) {
  assert(matchesExercise(exercise.latex, exercise));
  assert(matchesExercise(`$${exercise.latex}$`, exercise));
  assert(!matchesExercise('', exercise));
  assert(!matchesExercise('x+1', exercise));
}
assert(matchesExercise(String.raw`\int_{0}^{1} x^{2}\,\mathrm{d}x`, exercises[1]));
assert(matchesExercise(String.raw`\sum^n_{k=1}k^{2}`, exercises[3]));
assert(matchesExercise(String.raw`\lim_{x\rightarrow 0}\dfrac{\sin\left(x\right)}{x}`, exercises[4]));
assert(matchesExercise(String.raw`\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}`, exercises[0]));
assert(!matchesExercise(String.raw`\begin{bmatrix}1&3\\2&4\end{bmatrix}`, exercises[0]));
assert(!matchesExercise(String.raw`\int_0^2 x^2dx`, exercises[1]));
assert(!matchesExercise(String.raw`\frac{x+1}{\sqrt{x^2}+1}`, exercises[2]));
assert(!matchesExercise(String.raw`\sum_{k=0}^n k^2`, exercises[3]));
assert(!matchesExercise(String.raw`\lim_{x\to1}\frac{\sin x}{x}`, exercises[4]));
console.log('Exercise checker: all five targets, formatting variants, and incorrect bounds/grouping pass.');

assert(matchesExercise(String.raw`\int_0^1x^2\differentialD x`, exercises[1]));
