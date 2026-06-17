# MathPaster — Easy Math for AI Chatbots

A Chrome extension that lets you visually write math and insert clean LaTeX
into AI chatbots like ChatGPT, Claude, and Gemini. Press **Ctrl+M**
(**Cmd+M** on Mac) on any page, build your equation in a WYSIWYG editor
powered by [MathLive](https://cortexjs.io/mathlive/), and insert it straight
into the active input box.

[**Install from the Chrome Web Store**](https://chromewebstore.google.com/detail/mathpaster/gpfikddlkclmegpdjoaflmbndcnddleg)
· [**Try the live demo**](https://mathpaster.com/)

![MathPaster editor overlay](assets/promotional-1280x800.png)

## Features

- Visual editor with a full palette of math notation: fractions, matrices,
  integrals, Greek letters, and more.
- Inserts LaTeX directly at your caret — works with plain textareas and
  rich contenteditable inputs (ChatGPT, Claude, Gemini, DeepSeek).
- Select existing `$...$` / `$$...$$` text before opening to edit it in place.
- Draggable, resizable window and virtual keyboard with persistent layout.
- 100% local: no external APIs, no telemetry, no data collection.
  ([Privacy policy](https://mathpaster.com/privacy.html))

## Project layout

| Path | What it is |
|------|------------|
| `mathlive/` | The extension itself — load this folder unpacked, zip it for the store. **Source of truth** for the shared editor files. |
| `docs/` | GitHub Pages site (mathpaster.com): landing page, live demo, privacy policy. `editor.html`, `editor.js`, and `lib/` are copies synced from `mathlive/`. |
| `assets/` | Store screenshots and promotional images (not shipped). |
| `scripts/` | Maintenance scripts (see below). |
| `CHROMEWEBSTORE.md` | Store listing copy, permission justifications, version/review history. |

## Development

1. Open `chrome://extensions`, enable Developer mode, and **Load unpacked**
   pointing at the `mathlive/` folder.
2. Edit code in `mathlive/` only. After changing `editor.html`, `editor.js`,
   or `lib/`, sync the demo site:

   ```sh
   scripts/sync-docs.sh
   ```

3. To package for the Chrome Web Store:

   ```sh
   scripts/build-zip.sh
   ```

   This produces `MathPaster.zip` at the repo root (gitignored — always
   rebuild rather than commit it).

## Support

Bug reports and feature requests: [GitHub issues](https://github.com/beny-karachun/MathPaster/issues)

## License

MathPaster is **source-available, not open-source**. The code is published so
anyone can audit it and verify the privacy claims, but all rights are reserved —
see [LICENSE](LICENSE) for what's permitted. Bundled third-party components
([MathLive](https://cortexjs.io/mathlive/), KaTeX fonts) remain under their own
MIT licenses.
