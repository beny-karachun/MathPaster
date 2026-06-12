# Chrome Web Store Listing — MathPaster - Easy Math for AI Chatbots

> Last Updated: 2026-06-12

## Store Listing

**Extension Name**
MathPaster - Easy Math for AI Chatbots

**Short Description**
Visually write math and insert flawless LaTeX into AI chatbots like ChatGPT, Claude, and Gemini with a beautiful WYSIWYG editor.

**Detailed Description** (matches the live listing, updated for v1.2.0)

Tired of struggling to type math formulas into ChatGPT, Claude, or Gemini?

We've all been there—trying to write complex equations with basic keyboard characters like e^(-x^2) / sqrt(pi) only to end up with parenthesis errors and a confused AI that outputs the wrong steps. Why is it so hard to type math in AI? Because chatbot inputs are built for words, not mathematical syntax.

MathPaster solves this. It is a visual, WYSIWYG (What You See Is What You Get) math editor that overlays on any website, allowing you to easily write, preview, and input flawless math equations into any AI chatbot in seconds.

🚀 HOW IT WORKS
-Click on the chatbot prompt box.
-Press Ctrl + M (or Cmd + M on Mac) to instantly pop up the MathPaster editor.
-Write your equation visually using our toolbar or quick backslash (\) autocomplete commands.
-Press Ctrl + Enter to insert the formatted LaTeX directly into your chat window!
-To edit $...$ code that you already input, highlight with your cursor from delimiter to delimiter ($ or $$), and press Ctrl+M, you'll see it in the editor!

✨ KEY FEATURES
Visual WYSIWYG Editor: Stop guessing if you missed a bracket. See a beautiful, real-time preview of your fractions, integrals, matrices, and symbols as you write them.

Smart Autocomplete Recommendations: Type \ followed by a command (like \frac, \sqrt, \alpha) to quickly select and commit math blocks entirely from your keyboard.

Custom Symbol Tabs (Pro): Build your own symbol palettes — name a tab, add any \command with autocomplete, and drag tabs into the order you like.

Instant Inline & Block Toggles: Choose between inline mode ($ formula $ for sentence integration) and block mode ($$ formula $$ for centered, prominent equations).

Keyboard-First Workflow: Control everything without touching your mouse using intuitive hotkeys.

10 Curated Color Themes: Hand-tuned dark and light themes — Indigo Night, Anthropic, Emerald, Crimson, Daylight, and more — plus full control over editor size, spacing, and background blur. (Two themes are free; all ten come with Pro.)

Local Drafting & Caching: Your equation drafts are saved in real-time. If you close the overlay or reload the page, your progress remains safe.

💎 MATHPASTER PRO (OPTIONAL)
The core editor is free, forever. Pro unlocks custom symbol tabs and all 10 color themes:
$2.99/month · $11.99/year · or $19.99 once — yours forever.
Checkout is handled securely by Lemon Squeezy. Your license key arrives by email and activates in the editor under Settings → MathPaster Pro.

🤖 COMPATIBLE AI MODELS & PLATFORMS
MathPaster generates clean, standard LaTeX math delimiters which are natively read and beautifully rendered by all leading LLMs: ChatGPT, Claude, Gemini, DeepSeek, Copilot, and Qwen — plus homework platforms, wikis, forums, and any other text input on the web.

🌐 COMPATIBILITY & PRIVACY
Universal Browser Support: Runs on Google Chrome, Brave, Opera, Microsoft Edge, Vivaldi, and any other desktop Chromium-based browser.
Privacy-First: MathPaster runs completely locally in your browser. We never collect, store, or transmit your equations, chat history, or personal data. The only network request the extension can ever make is optional: verifying your license key with Lemon Squeezy when you choose to activate Pro.

⌨️ QUICK HOTKEYS
Toggle Editor Overlay: Ctrl + M (Windows/Linux) or Cmd + M (macOS)
Insert Formula to Chat: Ctrl + Enter (or Cmd + Enter)
Close Editor: Esc
Commit Autocomplete Suggestion: Enter

Make writing math to AI effortless. Install MathPaster today and stop copy-pasting equations!

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
