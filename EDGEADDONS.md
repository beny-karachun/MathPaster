# Microsoft Edge Add-ons Listing — MathPaster

> Created: 2026-06-12 · Status: not yet submitted

Edge runs Manifest V3 Chrome extensions unchanged — **upload the exact same `MathPaster.zip`** built by `scripts/build-zip.sh`. No code changes are needed (all `chrome.*` APIs used — storage, scripting, tabs, commands — are supported by Edge).

## One-time setup

1. Register a Microsoft Partner Center account at https://partner.microsoft.com/dashboard/microsoftedge/public/login (Microsoft account required; the developer registration for Edge extensions is **free**, no fee).
2. Once approved, go to **Microsoft Edge program → Overview → Create new extension**.

## Submission steps

1. Upload `MathPaster.zip`.
2. **Availability**: Public, all markets.
3. **Properties**:
   - Category: Productivity → Developer tools
   - Privacy policy URL: https://beny-karachun.github.io/MathPaster/privacy.html
   - Website: https://mathpaster.com
   - Support contact: https://github.com/beny-karachun/MathPaster/issues
   - Mark "This extension provides in-app purchases" (Pro is sold via Lemon Squeezy).
4. **Listing** (reuse the Chrome copy from [CHROMEWEBSTORE.md](CHROMEWEBSTORE.md)):
   - Name, short description, detailed description — paste as-is.
   - Logo: `mathlive/icons/icon128.png` (Edge wants 128×128 or 300×300).
   - Screenshots: `assets/promo_1280x800.png`, `assets/promo_2_1280x800.png` (1280×800 accepted).
5. **Testing notes for reviewers**: mention that the only network call is optional license validation against `api.lemonsqueezy.com` when a user activates MathPaster Pro; everything else is local.
6. Submit. Edge review typically takes ~1–7 business days.

## After publication

1. Copy the listing URL (looks like `https://microsoftedge.microsoft.com/addons/detail/mathpaster/XXXXXXXX`).
2. Paste it into `EDGE_STORE_URL` in [mathlive/src/review.js](mathlive/src/review.js) — the in-editor "Rate it" banner then sends Edge users to the Edge listing instead of the Chrome one (it detects Edge via the user agent).
3. Optionally add an "Also available for Edge" badge/link on mathpaster.com.
4. Each new version: upload the same rebuilt `MathPaster.zip` to both stores.
