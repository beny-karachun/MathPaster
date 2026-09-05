# MathPaster Desktop for Fedora Linux

This is the standalone Fedora version of MathPaster. It is not a browser
extension and does not use Chrome extension APIs or the Chrome Web Store.

## What it does

- Opens or hides globally with **Alt+M**.
- On Fedora KDE Wayland, clears only inactive MathPaster portal actions before
  registering so Plasma performs a real bind after every relaunch.
- Uses Electron's portal callback plus a tiny isolated KDE signal listener,
  coalescing duplicate backend events without swallowing rapid key presses.
- Intercepts Alt+M before it reaches the focused editor, so the `M` is never
  inserted into the current equation when closing the window.
- Keeps running in the desktop tray when its window is closed.
- Offers a **Launch on restart** switch under Settings → General & Window and in the tray menu.
- Repairs older autostart entries so packaged Electron builds receive the hidden-start argument.
- Resizes freely with readable, native-size controls and a scrolling symbol palette.
- Remembers the window's last position and size across normal quits, login
  restarts, AppImage launches, and RPM launches.
- Uses XWayland when it is available inside a Wayland session, because native
  Wayland deliberately prevents applications from restoring global positions.
- Starts hidden when Fedora launches it after login.
- Keeps the draft and cursor when hidden; Copy & Hide never clears the equation.
- Offers window pinning, an undoable New Equation action, and a working in-frame virtual keyboard.
- Uses the full MathPaster editor, including palettes, matrices, snippets,
  themes, insert history, and the virtual keyboard.
- Copies finished inline or block LaTeX to the system clipboard. Press
  **Ctrl+V** in the application where you want the equation.
- Shows **Copied!** only after the native clipboard succeeds, and records both copy actions in history.

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

Use `npm start`, not `electron .`: `src/launch.sh` selects X11/XWayland before
Electron starts whenever `DISPLAY` is available. Electron 44 initializes Ozone
before loading `main.js`; setting `ozone-platform` from JavaScript is too late
and can create a window that exists internally but is absent from the desktop.
An explicit `--ozone-platform=wayland` override is supported for native-Wayland
testing, with compositor-controlled positioning. Sessions without `DISPLAY`
retain the native backend automatically.

The packaged `mathpaster` executable is the same launcher; `mathpaster.bin` is
the internal Electron binary, not the public entry point. The packaging hook
installs this wrapper for both AppImage and RPM, and generated source/autostart
entries also use the launcher.

GNOME may ask you to approve the global shortcut the first time the app runs.
If the title-bar status dot is red, the global shortcut could not be registered.
Check shortcut permissions or conflicting bindings; the tray and focused-editor
shortcut remain available.

When run from source or AppImage, MathPaster installs a small managed launcher
under `~/.local/share/applications/` before registering the shortcut. Fedora's
Wayland shortcut portal uses that launcher to identify the background app. An
RPM installation uses its system launcher instead.

Duplicate activation from the Electron and KDE backends is coalesced without
discarding rapid intentional presses from either backend.
On KDE Plasma, startup also removes obsolete MathPaster-only portal actions
left behind by earlier runs or shortcut changes, preserving the single live
binding and leaving every other application's shortcuts untouched.

Window bounds are saved atomically in `window-bounds.json` in Electron's user-data
directory. Saves happen after moves/resizes and are flushed on hide and quit.
Disconnected displays and corrupt state fall back to a visible work area. Exact
global position restoration requires X11/XWayland; native Wayland leaves position
up to the compositor. Linux uses software compositing to avoid GPU driver crashes
without disabling the Chromium sandbox.

## Verification

```sh
npm test
npm run check
npm run test:e2e
dbus-run-session -- node test/dbus.integration.cjs
```

The Electron suite needs a graphical X11/XWayland session and `xprop`. It opens an isolated temporary
profile, tests real window and clipboard behavior, takes screenshots, quits,
and restarts to verify saved state. Every show is checked against the desktop's
native window list and normal (not minimized) window state, not just Electron's
`isVisible()` result. Reopening the normal launcher must also reveal a hidden
or minimized existing instance. License responses are mocked: no purchase,
activation, or changes to your real profile occur. A running copy of MathPaster
may own Alt+M; the suite still tests the focused-editor interception path.

To test the packaged executable with the same suite:

```sh
MATHPASTER_TEST_EXECUTABLE="$PWD/dist/linux-unpacked/mathpaster" npm run test:e2e
```

Optional native D-Bus socket addons are omitted by `.npmrc`; Fedora's session bus
uses Node's Unix sockets. The XML parser is pinned to a patched release. Use
`npm ci` to reproduce the tested dependency tree.

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
