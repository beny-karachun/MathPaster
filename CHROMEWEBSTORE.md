# Chrome Web Store Listing — MathPaster - Easy Math for AI Chatbots

> Last Updated: 2026-09-14

## Store Listing

Suggested metadata for the next Chrome Web Store listing update (not automatically published by GitHub Pages).

**Extension Name**
MathPaster - Math Keyboard for AI

**Short Description**
Type equations into ChatGPT, Claude and Gemini with a visual math keyboard. Insert fractions, integrals and matrices as LaTeX.

**Detailed Description**
MathPaster is a free visual math keyboard and equation editor for Chrome. Build equations in a preview, then insert LaTeX into prompts in ChatGPT, Claude, Gemini and other webpage text inputs.

Write math without describing every bracket and matrix row in words. MathPaster helps you check the notation before you send your question.

GET STARTED
1. Click your chatbot's prompt field.
2. Open MathPaster with Ctrl+M on Windows/Linux or Cmd+M on Mac, or use the extension icon.
3. Type an equation or choose symbols from the palette.
4. Press Insert or Ctrl+Enter (Cmd+Enter on Mac) to place LaTeX into the prompt.
5. Add your question and send it yourself.

KEYBOARD SHORTCUTS
• Press / to create a fraction; use arrow keys to navigate its fields.
• With Auto-Symbols enabled, type sqrt, int or sum to insert notation.
• Type a backslash for LaTeX command autocomplete.
• Build a matrix with Linear Algebra → [ ] → 2 × 2, then Tab between cells.

FREE FEATURES
• Visual fractions, roots, integrals, sums, limits, matrices and Greek symbols.
• Built-in symbol palettes and Auto-Symbols.
• LaTeX copying, direct insertion and live code preview.
• History of your last 20 inserted expressions.
• Precision and Paper themes, editor sizing and layout controls.

OPTIONAL PRO
Save named snippets in folders, create custom symbol tabs, and use Glass and Vaporwave themes. See current plans at https://mathpaster.com/#pricing. The core editor remains free.

COMPATIBILITY
For desktop Chrome and compatible Chromium browsers, including Edge, Brave, Opera and Vivaldi. Browser-protected pages and some custom inputs restrict extensions. If direct insertion fails, use Copy LaTeX and paste manually. Not a Firefox, Safari or mobile extension.

PRIVACY
Equation editing takes place in your browser. Optional Pro activation and license validation contact Lemon Squeezy. The chatbot's own policies apply when you send your prompt. See https://mathpaster.com/privacy.html.

MathPaster is an input tool, not a math solver. It does not guarantee correct AI answers and is not affiliated with OpenAI, Anthropic or Google.

Try it without installing: https://mathpaster.com/#demo
Step-by-step examples: https://mathpaster.com/type-math-in-ai/

**Category**
Education

**Single Purpose**
Visually write mathematical expressions and insert their LaTeX into active webpage text inputs.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `mathlive/icons/icon128.png` |
| Screenshot 1 | 1280×800 or 640×400 | ✅ Ready | `assets/promo_1280x800.png` |
| Screenshot 2 | 1280×800 or 640×400 | ✅ Ready | `assets/promo_2_1280x800.png` |

### Screenshot Notes
- Screenshots demonstrate the visual overlay editor running directly on top of chatbot interfaces.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `activeTab` | permissions | Used to inject the visual overlay editor into the active tab when the user triggers it via keyboard shortcut or extension action. |
| `scripting` | permissions | Required to execute the content script (`content.js`) on the active tab context. |
| `storage` | permissions | Used to store user preferences such as editor window sizing, color theme, and customized settings locally. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Minimal — only for optional Pro activation.

In the dashboard disclosures, declare **Authentication information**: when a user activates MathPaster Pro, the license key they enter is transmitted to the Lemon Squeezy licensing API (api.lemonsqueezy.com) to verify the purchase and is re-validated periodically. The key is stored in `chrome.storage.sync`. Nothing else is collected — no equations, browsing data, or identifiers.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**
https://beny-karachun.github.io/MathPaster/privacy.html

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free (contains optional paid upgrade — tick "This item contains in-app purchases" in the dashboard; payments are processed externally by Lemon Squeezy at https://mathpaster.lemonsqueezy.com)

## Developer Info

**Publisher Name**
Beny Karachun

**Contact Email**
benykarachun@gmail.com

**Support URL / Email**
https://github.com/beny-karachun/MathPaster/issues

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.2.0 | 2026-06-12 | MathPaster Pro (custom tabs + premium themes, Lemon Squeezy license activation), 10 curated color themes with light mode, drag-to-reorder tabs, in-editor review prompt. | Draft |
| 1.0.2 | 2026-05-27 | Removed remotely hosted code (Google Fonts and sandbox test files). | Draft |
| 1.0.1 | 2026-05-23 | Internal optimization. | Rejected |
| 1.0.0 | 2026-05-17 | Initial release. | Published |

## Review Notes

### Rejection History
| Date | Reason | Fix Applied | Resubmitted |
|------|--------|-------------|-------------|
| 2026-05-27 | Violation: Including remotely hosted code in a Manifest V3 item. | Deleted `test_kb.html` (which imported from unpkg CDN) and removed Google Fonts stylesheet link from `popup.html`. | Yes |
