// Demo-only coaching: follow the controls the visitor actually clicks.
export function startMatrixGuide(frame, report) {
  const doc = frame.contentDocument;
  if (!doc?.querySelector('#category-tabs')) return () => {};
  const style = doc.createElement('style');
  style.textContent = `
    .exercise-guide-target { outline: 3px solid #69e9b4 !important; outline-offset: 2px; animation: exercise-guide-pulse 1.6s ease-in-out infinite; }
    @keyframes exercise-guide-pulse { 50% { outline-color: #69e9b455; box-shadow: 0 0 12px #69e9b466; } }
    @media (prefers-reduced-motion: reduce) { .exercise-guide-target { animation: none; } }
  `;
  doc.head.append(style);
  let target, squareOpen = false, finished = false;
  function update() {
    let next = null;
    if (!finished) {
      const tab = doc.querySelector('.cat-tab[data-key="Linear Algebra"]');
      if (!tab?.classList.contains('active')) {
        next = tab;
        report('1 / 3 · Click Linear Algebra.');
      } else if (squareOpen && doc.querySelector('#matrix-selector.visible')) {
        next = doc.querySelector('.matrix-cell[data-r="2"][data-c="2"]');
        report('3 / 3 · Choose 2×2.');
      } else {
        next = doc.querySelector('.pal-btn[title="[ ]"]');
        report('2 / 3 · Click [ ].');
      }
    }
    if (next === target) return;
    target?.classList.remove('exercise-guide-target');
    target = next;
    target?.classList.add('exercise-guide-target');
    // Reveal a clipped category without scrolling the landing page to the demo.
    if (target?.classList.contains('cat-tab')) {
      const tabs = doc.querySelector('#category-tabs');
      if (target.offsetLeft < tabs.scrollLeft || target.offsetLeft + target.offsetWidth > tabs.scrollLeft + tabs.clientWidth) tabs.scrollLeft = target.offsetLeft;
    }
  }
  function click(event) {
    const button = event.target.closest('.pal-btn');
    if (button) squareOpen = button.title === '[ ]';
    const cell = event.target.closest('.matrix-cell');
    if (cell && squareOpen && cell.dataset.r === '2' && cell.dataset.c === '2') {
      finished = true;
      report('Fill 1, 2, 3, 4 · Tab between cells.');
    }
    update();
  }
  const observer = new MutationObserver(update);
  observer.observe(doc.querySelector('#category-tabs'), {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});
  observer.observe(doc.querySelector('#palette'), {childList: true});
  observer.observe(doc.querySelector('#matrix-selector'), {attributes: true, attributeFilter: ['class']});
  doc.addEventListener('click', click);
  update();
  return () => { observer.disconnect(); doc.removeEventListener('click', click); target?.classList.remove('exercise-guide-target'); style.remove(); };
}
