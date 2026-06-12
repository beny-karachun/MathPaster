import { state } from './state.js';

/* ── MathPaster Pro licensing (Lemon Squeezy) ──
 * No backend: the extension talks directly to Lemon Squeezy's public license
 * API (activate/validate/deactivate need no API key and allow CORS from
 * anywhere). The license state is cached in chrome.storage.sync when running
 * as an extension (follows the user's Chrome profile) or localStorage on the
 * web demo. Validation is re-run silently once a week and FAILS OPEN — a
 * paying user never loses Pro because they're offline.
 */
export const CHECKOUT_URL = 'https://mathpaster.lemonsqueezy.com/checkout/buy/116cec85-efb3-4029-b9ee-63fbc0c089cd';
// Numeric store id as reported by the activation response (meta.store_id).
// null = accept keys from any store; set after the first (test) purchase to
// reject keys bought from unrelated Lemon Squeezy stores.
const EXPECTED_STORE_ID = null;
const API_BASE = 'https://api.lemonsqueezy.com/v1/licenses';
const STORAGE_KEY = 'mathpaster_license';
const REVALIDATE_MS = 7 * 24 * 60 * 60 * 1000;
// SHA-256 of a private developer master key. Only the hash ships, so the key
// can't be recovered from the source. A matching key activates Pro locally
// (no API call) and is never re-validated.
const MASTER_KEY_HASH = '001e746d658fa9fd244758e54a6149aac3b7074e374e538cff91f18e902416f7';

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function isPro() { return !!(state.license && state.license.pro); }

/* ── Storage (chrome.storage.sync with localStorage fallback) ── */
function chromeSync() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) return chrome.storage.sync;
  } catch (e) {}
  return null;
}

function readStored() {
  const sync = chromeSync();
  if (sync) return new Promise(res => sync.get(STORAGE_KEY, o => res((o && o[STORAGE_KEY]) || null)));
  try { return Promise.resolve(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch (e) { return Promise.resolve(null); }
}

function writeStored(value) {
  const sync = chromeSync();
  if (sync) {
    return new Promise(res => {
      if (value == null) sync.remove(STORAGE_KEY, () => res());
      else sync.set({ [STORAGE_KEY]: value }, () => res());
    });
  }
  try {
    if (value == null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (e) {}
  return Promise.resolve();
}

/* ── Lemon Squeezy license API ── */
async function licensePost(action, params) {
  const resp = await fetch(`${API_BASE}/${action}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });
  return resp.json().catch(() => ({}));
}

export async function activateLicense(key) {
  if ((await sha256Hex(key)) === MASTER_KEY_HASH) {
    state.license = { key, instanceId: null, storeId: null, pro: true, master: true, lastValidated: Date.now() };
    await writeStored(state.license);
    notifyChange();
    return state.license;
  }
  const data = await licensePost('activate', { license_key: key, instance_name: 'MathPaster' });
  if (!data.activated) throw new Error(data.error || 'That license key could not be activated.');
  if (EXPECTED_STORE_ID && data.meta && data.meta.store_id !== EXPECTED_STORE_ID) {
    throw new Error('This key was issued by a different store.');
  }
  state.license = {
    key,
    instanceId: (data.instance && data.instance.id) || null,
    storeId: (data.meta && data.meta.store_id) || null,
    pro: true,
    lastValidated: Date.now()
  };
  await writeStored(state.license);
  notifyChange();
  return state.license;
}

export async function deactivateLicense() {
  const lic = state.license;
  if (lic && lic.key && lic.instanceId) {
    // Best effort: free up the activation slot; clearing locally matters more.
    try { await licensePost('deactivate', { license_key: lic.key, instance_id: lic.instanceId }); } catch (e) {}
  }
  state.license = null;
  await writeStored(null);
  notifyChange();
}

async function revalidate() {
  const lic = state.license;
  if (!lic || !lic.key || lic.master) return;
  try {
    const params = { license_key: lic.key };
    if (lic.instanceId) params.instance_id = lic.instanceId;
    const data = await licensePost('validate', params);
    if (data && data.valid === false) {
      // Explicit revocation (refund / key disabled) — anything else fails open.
      state.license = null;
      await writeStored(null);
      notifyChange();
    } else if (data && data.valid) {
      lic.lastValidated = Date.now();
      await writeStored(lic);
    }
  } catch (e) {}
}

export async function loadLicense() {
  state.license = await readStored();
  notifyChange();
  if (isPro() && Date.now() - (state.license.lastValidated || 0) > REVALIDATE_MS) revalidate();
}

/* ── Settings-panel "MathPaster Pro" section ── */
const statusEl     = document.getElementById('license-status');
const inputRowEl   = document.getElementById('license-input-row');
const keyInputEl   = document.getElementById('license-key-input');
const activateBtn  = document.getElementById('license-activate-btn');
const deactivateBtn= document.getElementById('license-deactivate-btn');
const msgEl        = document.getElementById('license-msg');
const buyLinkEl    = document.getElementById('license-buy-link');

function maskedKey(key) {
  const k = String(key || '');
  return k.length > 6 ? '••••' + k.slice(-6) : k;
}

function updateLicenseUI() {
  if (!statusEl) return;
  const pro = isPro();
  statusEl.textContent = pro ? `Pro active · key ${maskedKey(state.license.key)}` : 'Free plan';
  statusEl.classList.toggle('pro', pro);
  if (inputRowEl) inputRowEl.style.display = pro ? 'none' : '';
  if (buyLinkEl) { buyLinkEl.style.display = pro ? 'none' : ''; buyLinkEl.href = CHECKOUT_URL; }
  if (deactivateBtn) deactivateBtn.style.display = pro ? '' : 'none';
}

function setMsg(text, ok) {
  if (!msgEl) return;
  msgEl.textContent = text || '';
  msgEl.classList.toggle('ok', !!ok);
}

function notifyChange() {
  updateLicenseUI();
  document.dispatchEvent(new CustomEvent('mathpaster:license-changed'));
}

if (activateBtn) {
  activateBtn.addEventListener('mousedown', e => e.preventDefault());
  activateBtn.addEventListener('click', async e => {
    e.preventDefault();
    const key = (keyInputEl && keyInputEl.value || '').trim();
    if (!key) { setMsg('Paste the license key from your purchase email.'); return; }
    activateBtn.disabled = true;
    activateBtn.textContent = 'Activating…';
    setMsg('');
    try {
      await activateLicense(key);
      if (keyInputEl) keyInputEl.value = '';
      setMsg('Pro unlocked — thank you! 🎉', true);
    } catch (err) {
      setMsg(err && err.message ? err.message : 'Activation failed. Check the key and try again.');
    } finally {
      activateBtn.disabled = false;
      activateBtn.textContent = 'Activate';
    }
  });
}

if (keyInputEl) {
  keyInputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); if (activateBtn) activateBtn.click(); }
  });
}

if (deactivateBtn) {
  deactivateBtn.addEventListener('mousedown', e => e.preventDefault());
  deactivateBtn.addEventListener('click', async e => {
    e.preventDefault();
    deactivateBtn.disabled = true;
    try { await deactivateLicense(); setMsg('License deactivated on this device.'); }
    finally { deactivateBtn.disabled = false; }
  });
}

/* ── Upgrade modal ── */
const proOverlay = document.getElementById('pro-overlay');

export function openUpgradeModal(feature) {
  const line = document.getElementById('pro-modal-feature');
  if (line) line.textContent = feature || 'This feature is part of MathPaster Pro.';
  if (proOverlay) proOverlay.classList.add('visible');
}

function closeUpgradeModal() {
  if (proOverlay) proOverlay.classList.remove('visible');
}

const proBuyBtn = document.getElementById('pro-buy-btn');
if (proBuyBtn) {
  proBuyBtn.addEventListener('mousedown', e => e.preventDefault());
  proBuyBtn.addEventListener('click', e => {
    e.preventDefault();
    window.open(CHECKOUT_URL, '_blank', 'noopener');
  });
}

const proHaveKeyBtn = document.getElementById('pro-have-key-btn');
if (proHaveKeyBtn) {
  proHaveKeyBtn.addEventListener('mousedown', e => e.preventDefault());
  proHaveKeyBtn.addEventListener('click', e => {
    e.preventDefault();
    closeUpgradeModal();
    // Jump straight to the license input inside the settings panel.
    const proGroup = document.getElementById('pro-settings-group');
    if (proGroup) proGroup.open = true;
    const overlay = document.getElementById('settings-overlay');
    if (overlay) overlay.classList.add('visible');
    if (keyInputEl) requestAnimationFrame(() => { try { keyInputEl.focus(); } catch (err) {} });
  });
}

const closeProBtn = document.getElementById('close-pro-btn');
if (closeProBtn) closeProBtn.addEventListener('click', closeUpgradeModal);
if (proOverlay) proOverlay.addEventListener('mousedown', e => { if (e.target === proOverlay) closeUpgradeModal(); });
