# Chrome Web Store Listing — MathPaster - Easy Math for AI Chatbots

> Last Updated: 2026-05-27

## Store Listing

**Extension Name**
MathPaster - Easy Math for AI Chatbots

**Short Description**
Visually write math and insert flawless LaTeX into AI chatbots like ChatGPT, Claude, and Gemini with a beautiful WYSIWYG editor.

**Detailed Description**
Visually write mathematical equations and insert LaTeX directly into AI chatbot inputs (ChatGPT, Claude, Gemini, etc.).

MathPaster is a lightweight WYSIWYG mathematical editor overlay. It provides a visual palette of mathematical symbols, fractions, matrices, integrals, and other operators, converting your inputs into clean, standard LaTeX syntax, and automatically pasting it into the active text area.

Features:
- Seamless integration with ChatGPT, Claude, Gemini, and other text inputs.
- Visual editor with comprehensive math notation support.
- Configurable keyboard shortcuts (Ctrl+M to toggle).
- Works 100% locally with no external APIs or telemetry.

How to use it:
1. Open any webpage or AI chatbot.
2. Press Ctrl+M (or Command+M on Mac) or click the extension icon to open the overlay.
3. Use the visual editor to construct your equation.
4. Press Ctrl+Enter or click the "Insert" button to paste the LaTeX markup directly into the active chatbot input box.

Privacy/permissions note:
MathPaster operates entirely locally on your device. We do not collect, store, or transmit any user inputs, web history, or personal data.

**Category**
Developer Tools

**Single Purpose**
Visually write math equations and insert LaTeX format directly into active text inputs on web pages.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `mathlive/icons/icon128.png` |
| Screenshot 1 | 1280×800 or 640×400 | ✅ Ready | `promo_1280x800.png` |
| Screenshot 2 | 1280×800 or 640×400 | ✅ Ready | `promo_2_1280x800.png` |

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

**Does the extension collect user data?** No

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
**Pricing**: Free

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
| 1.0.2 | 2026-05-27 | Removed remotely hosted code (Google Fonts and sandbox test files). | Draft |
| 1.0.1 | 2026-05-23 | Internal optimization. | Rejected |
| 1.0.0 | 2026-05-17 | Initial release. | Published |

## Review Notes

### Rejection History
| Date | Reason | Fix Applied | Resubmitted |
|------|--------|-------------|-------------|
| 2026-05-27 | Violation: Including remotely hosted code in a Manifest V3 item. | Deleted `test_kb.html` (which imported from unpkg CDN) and removed Google Fonts stylesheet link from `popup.html`. | Yes |
