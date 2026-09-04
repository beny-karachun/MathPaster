/* ── "Rate us" banner ──
 * Shown inside the editor once the user has successfully inserted/copied math
 * a few times (counted in recordUse, displayed on the NEXT editor open so it
 * never interrupts the insert flow). Clicking Rate or dismissing twice
 * silences it forever; the first dismissal snoozes it for 20 more uses.
 */
const COMMUNITY_URL = 'https://mathpaster.com';
const KEY = 'mathpaster_review';
const FIRST_AT = 5;
const SNOOZE_USES = 20;

function load() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  return { uses: 0, nextAt: FIRST_AT, dismissals: 0, done: false, ...(saved || {}) };
}

function save(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
}

export function recordUse() {
  const d = load();
  d.uses++;
  save(d);
}

export function maybeShowRateBanner() {
  if (new URLSearchParams(location.search).has('desktop')) return;
  const d = load();
  if (d.done || d.uses < d.nextAt) return;
  const header = document.getElementById('header');
  if (!header || document.getElementById('rate-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'rate-banner';
  banner.innerHTML =
    '<span class="rate-banner-text">Enjoying MathPaster? See what else is new ★</span>' +
    '<button class="rate-banner-btn" id="rate-banner-go">Visit site</button>' +
    '<button class="rate-banner-close" id="rate-banner-close" title="Dismiss">✕</button>';
  header.insertAdjacentElement('afterend', banner);

  document.getElementById('rate-banner-go').addEventListener('click', () => {
    const cur = load();
    cur.done = true;
    save(cur);
    window.open(COMMUNITY_URL, '_blank', 'noopener');
    banner.remove();
  });

  document.getElementById('rate-banner-close').addEventListener('click', () => {
    const cur = load();
    cur.dismissals++;
    if (cur.dismissals >= 2) cur.done = true;
    else cur.nextAt = cur.uses + SNOOZE_USES;
    save(cur);
    banner.remove();
  });
}
