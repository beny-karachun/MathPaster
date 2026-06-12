/* ── "Rate us" banner ──
 * Shown inside the editor once the user has successfully inserted/copied math
 * a few times (counted in recordUse, displayed on the NEXT editor open so it
 * never interrupts the insert flow). Clicking Rate or dismissing twice
 * silences it forever; the first dismissal snoozes it for 20 more uses.
 */
const STORE_REVIEWS_URL = 'https://chromewebstore.google.com/detail/mathpaster/gpfikddlkclmegpdjoaflmbndcnddleg/reviews';
// Fill in once the Edge Add-ons listing is live; used when running in Edge.
const EDGE_STORE_URL = null;
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

function storeUrl() {
  if (EDGE_STORE_URL && navigator.userAgent.includes(' Edg/')) return EDGE_STORE_URL;
  return STORE_REVIEWS_URL;
}

export function maybeShowRateBanner() {
  const d = load();
  if (d.done || d.uses < d.nextAt) return;
  const header = document.getElementById('header');
  if (!header || document.getElementById('rate-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'rate-banner';
  banner.innerHTML =
    '<span class="rate-banner-text">Enjoying MathPaster? A quick review helps a lot ★</span>' +
    '<button class="rate-banner-btn" id="rate-banner-go">Rate it</button>' +
    '<button class="rate-banner-close" id="rate-banner-close" title="Dismiss">✕</button>';
  header.insertAdjacentElement('afterend', banner);

  document.getElementById('rate-banner-go').addEventListener('click', () => {
    const cur = load();
    cur.done = true;
    save(cur);
    window.open(storeUrl(), '_blank', 'noopener');
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
