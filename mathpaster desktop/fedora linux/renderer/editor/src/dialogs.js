// All editor dialogs share Escape, focus containment, and focus restoration.
const overlays = [...document.querySelectorAll('#settings-overlay, #tab-overlay, #history-overlay, #snippets-overlay, #pro-overlay')];
const openStack = [];
const returnFocus = new Map();
const focusable = 'button:not([disabled]), a[href], input:not([disabled]), select, textarea, summary, math-field, [tabindex="0"]';
const visibleControls = root => [...root.querySelectorAll(focusable)].filter(el => el.getClientRects().length && !el.closest('[hidden], [inert]'));

function syncDialogs() {
  for (const overlay of overlays) {
    const open = overlay.classList.contains('visible');
    const index = openStack.indexOf(overlay);
    if (open && index === -1) {
      window.mathVirtualKeyboard?.hide();
      document.getElementById('matrix-selector')?.classList.remove('visible');
      returnFocus.set(overlay, document.activeElement);
      openStack.push(overlay);
      const panel = overlay.firstElementChild;
      panel.tabIndex = -1;
      requestAnimationFrame(() => (visibleControls(overlay)[0] || panel).focus({ preventScroll: true }));
    } else if (!open && index !== -1) {
      openStack.splice(index, 1);
      const previous = returnFocus.get(overlay);
      returnFocus.delete(overlay);
      requestAnimationFrame(() => {
        if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({ preventScroll: true });
        else document.getElementById('mf').focus();
      });
    }
  }
  const top = openStack.at(-1);
  document.getElementById('editor-window').inert = Boolean(top);
  for (const overlay of overlays) {
    overlay.inert = Boolean(top && overlay !== top);
    overlay.setAttribute('aria-hidden', String(!overlay.classList.contains('visible')));
    if (overlay === top) overlay.setAttribute('aria-modal', 'true');
    else overlay.removeAttribute('aria-modal');
  }
}

for (const overlay of overlays) {
  overlay.setAttribute('role', 'dialog');
  const heading = overlay.querySelector('h2');
  if (heading) {
    heading.id ||= overlay.id + '-title';
    overlay.setAttribute('aria-labelledby', heading.id);
  }
  new MutationObserver(syncDialogs).observe(overlay, { attributes: true, attributeFilter: ['class'] });
}
document.addEventListener('keydown', event => {
  const top = openStack.at(-1);
  if (!top) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopImmediatePropagation();
    top.classList.remove('visible');
  } else if (event.key === 'Tab') {
    const controls = visibleControls(top);
    const first = controls[0] || top.firstElementChild;
    const last = controls.at(-1) || first;
    if (event.shiftKey && (document.activeElement === first || !top.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !top.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }
}, true);
syncDialogs();
