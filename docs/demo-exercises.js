import { startMatrixGuide } from './demo-matrix-guide.js';
import { exercises, matchesExercise } from './demo-exercise-data.js';

const $ = id => document.getElementById(id);
const frame = $('mathpaster-frame');
const input = $('demo-input');
const completed = new Set();
const answers = new Map();
let current = 0;
let ready = false;
let stopGuide = () => {};
function refreshGuide() {
  stopGuide();
  $('matrix-guide-status').textContent = '';
  if (ready && current === 0) stopGuide = startMatrixGuide(frame, text => { $('matrix-guide-status').textContent = text; });
}

function resetEditor() {
  if (ready) frame.contentWindow.postMessage({ mathpaster: 'reset', initialMath: { text: '', mode: 'inline' } }, location.origin);
}
function updateNavigation() {
  $('exercise-progress').textContent = `${completed.size} of ${exercises.length} completed`;
  document.querySelectorAll('.exercise-step').forEach((button, i) => {
    button.classList.toggle('active', i === current);
    button.classList.toggle('completed', completed.has(i));
    button.setAttribute('aria-current', i === current ? 'step' : 'false');
    button.textContent = `${completed.has(i) ? '✓' : i + 1}  ${exercises[i].short}`;
  });
  $('exercise-complete').hidden = completed.size !== exercises.length;
}
function selectExercise(i) {
  answers.set(current, input.value);
  current = i;
  const exercise = exercises[i];
  $('exercise-number').textContent = `EXERCISE ${i + 1} / ${exercises.length}`;
  $('exercise-title').textContent = exercise.title;
  $('exercise-instruction').textContent = exercise.instruction;
  $('exercise-target').innerHTML = window.MathLive.convertLatexToMarkup(exercise.latex);
  $('exercise-description').textContent = exercise.words;
  const ratio = (exercise.words.length / exercise.latex.length).toFixed(1);
  $('exercise-comparison').textContent = `${exercise.words.length} characters in words · ${exercise.latex.length} characters of generated LaTeX. The wording is ${ratio}× as long.`;
  $('exercise-hint').replaceChildren(...exercise.hint.split('`').map((part, i) => {
    if (i % 2 === 0) return document.createTextNode(part);
    const code = document.createElement('code');
    code.textContent = part;
    return code;
  }));
  input.value = answers.get(i) || '';
  $('exercise-status').textContent = completed.has(i) ? '✓ Completed. You can try it again.' : 'Build the target equation, then press Insert.';
  $('exercise-status').dataset.state = completed.has(i) ? 'success' : 'idle';
  $('exercise-next').hidden = !completed.has(i) || completed.size === exercises.length;
  updateNavigation();
  resetEditor();
  refreshGuide();
}
function checkAnswer() {
  const success = matchesExercise(input.value, exercises[current]);
  answers.set(current, input.value);
  if (success) completed.add(current);
  $('exercise-status').dataset.state = success ? 'success' : 'retry';
  $('exercise-status').textContent = success ? '✓ That’s it! Your notation matches the target.' : input.value.trim() ? 'Not quite yet. Compare the symbols, bounds, and grouping with the target. The hint can help.' : 'Write an equation in the editor, then press Insert.';
  $('exercise-next').hidden = !success || completed.size === exercises.length;
  updateNavigation();
}
exercises.forEach((exercise, i) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'exercise-step';
  button.addEventListener('click', () => selectExercise(i));
  $('exercise-nav').appendChild(button);
});
$('exercise-check').addEventListener('click', checkAnswer);
input.addEventListener('input', () => {
  $('exercise-status').dataset.state = 'idle';
  $('exercise-status').textContent = 'Press Check answer when you’re ready.';
  $('exercise-next').hidden = true;
});
$('exercise-next').addEventListener('click', () => {
  const next = exercises.findIndex((_, i) => i > current && !completed.has(i));
  selectExercise(next >= 0 ? next : exercises.findIndex((_, i) => !completed.has(i)));
});
window.addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.origin !== location.origin || !event.data) return;
  if (event.data.mathpaster === 'ready') { ready = true; refreshGuide(); return; }
  if (event.data.mathpaster === 'insert' && typeof event.data.latex === 'string') {
    input.value = event.data.latex;
    checkAnswer();
  } else if (event.data.mathpaster === 'toast') {
    $('exercise-status').textContent = String(event.data.text || '');
  }
});
frame.addEventListener('load', () => { ready = true; refreshGuide(); });
ready = frame.contentDocument?.readyState === 'complete';
selectExercise(0);
