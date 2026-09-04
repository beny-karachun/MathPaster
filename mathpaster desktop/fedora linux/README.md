# MathPaster Desktop for Fedora Linux

This is the standalone Fedora version of MathPaster. It is not a browser
extension and does not use Chrome extension APIs or the Chrome Web Store.

## What it does

- Opens or hides globally with **Ctrl+Shift+M**.
- Keeps running in the desktop tray when its window is closed.
- Offers a **Launch on restart** switch in the title bar and tray menu.
- Starts hidden when Fedora launches it after login.
- Uses the full MathPaster editor, including palettes, matrices, snippets,
  themes, insert history, and the virtual keyboard.
- Copies finished inline or block LaTeX to the system clipboard. Press
  **Ctrl+V** in the application where you want the equation.

The copy-and-close workflow is intentional: Fedora's default GNOME Wayland
session prevents applications from silently injecting keystrokes into other
applications.

## Run for development

Requires Node.js 22 or newer.

```sh
cd "mathpaster desktop/fedora linux"
npm install
npm start
```

GNOME may ask you to approve the global shortcut the first time the app runs.
If the title-bar status dot is red, another application has already reserved
Ctrl+Shift+M.

## Build Fedora packages

```sh
npm run dist
```

Build artifacts are written to `dist/`:

- `MathPaster-<version>-<arch>.rpm` for a normal Fedora installation.
- `MathPaster-<version>-<arch>.AppImage` for a portable version.

Install the RPM with:

```sh
sudo dnf install ./dist/MathPaster-*.rpm
```

## Launch on restart

The option creates the standard XDG autostart file:

```text
~/.config/autostart/com.mathpaster.MathPaster.desktop
```

Turning the option off removes only that file. The installed application menu
entry is managed separately by the RPM package. When running the portable
AppImage, the autostart entry points to the original AppImage rather than its
temporary mount path, so move the AppImage to its permanent location before
enabling the option.

## Security model

The renderer uses Electron context isolation, sandboxing, and no Node.js
integration. It can reach the operating system only through the small API in
`preload.js`. External links are opened by the system browser.
