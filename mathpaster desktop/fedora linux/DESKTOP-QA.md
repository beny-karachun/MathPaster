# Desktop repair and polish

Scope: the Fedora Electron app in this directory. The web app, browser extension,
and payment product configuration are unchanged. UI work followed the
`make-interfaces-feel-better` skill: readable sizing, consistent surfaces,
accessible hit areas/focus, and restrained, reduced-motion-aware feedback.

## Window and lifecycle reliability

| Before | After |
| --- | --- |
| Experimental Electron bounds were lost on restart in a real test. | `src/window-state.js` saves normal bounds atomically, debounces movement, flushes on hide/quit, and migrates the old preference. |
| Saved coordinates could belong to a disconnected monitor. | Bounds are validated and fitted to the current displays; negative monitor coordinates remain supported. |
| Whole-editor scaling and a fixed aspect ratio made controls tiny. | `main.js` allows independent resizing, with a responsive 500×440 minimum. |
| Showing the app could reset editor content/cursor. | `renderer/desktop.js` initializes each frame once; reopening only restores focus. |
| Show/shortcut requests could race startup. | `main.js` tracks readiness and requested visibility. |
| Restore could unmaximize an X11 window. | `src/window-visibility.js` restores only when needed, preserving the native-Wayland workaround. |
| `app.quit()` could be intercepted by close-to-tray. | The `before-quit` path flushes bounds and bypasses hide-on-close. |
| Repeated GPU-process crashes occurred on this Fedora session. | Linux uses software compositing; Chromium sandboxing remains enabled. |
| Startup, tray, renderer, and math-engine failure paths could be silent. | `main.js` and the shell provide visible recovery/error paths and a reload action. |
| Global shortcut failure was always described as a conflict. | The status explains registration/permission failures and the tray fallback; focused Alt+M remains intercepted before text input. |

## Editing and clipboard workflows

| Before | After |
| --- | --- |
| Copy & Close removed the saved draft before clipboard success. | `actions.js` preserves the draft and names the action **Copy & Hide**. |
| Copy success/history could be recorded before native success. | Request IDs tie acknowledgements to the correct copy; only successful copies are recorded. |
| Empty or repeated copy attempts could run. | Actions stay disabled for empty/loading/busy states; failed or timed-out attempts recover. |
| Previous green copy feedback could survive a new failed attempt. | Starting a new copy clears earlier feedback. |
| A delayed Copy & Hide could close a newly reopened window. | Both renderer cancellation and a native visibility revision reject stale hides. |
| Mode updates changed unrelated Auto-Symbols labels. | Label updates are scoped to the inline/block selector. |
| Starting a fresh equation was awkward. | The New Equation toolbar action clears through MathLive's undo stack. |
| The virtual keyboard used an inert parent-frame proxy. | `mathfield.js` uses MathLive's frame-local keyboard, with event wiring after initialization and preserved input focus. |
| Keyboard keys could be clipped or low-contrast. | The keyboard has a bounded viewport, fixed-size keycaps, themed colors, and corrected bottom positioning. |
| Matrix cells were non-keyboard-operable divs and popup positioning assumed a fixed size. | `matrix.js` uses labelled buttons, focus feedback, and measured viewport clamping. |
| Malformed saved tabs, history, or snippets could crash rendering. | Stored shapes are filtered; duplicate tab IDs/order entries and invalid overrides are rejected. |
| Re-editing a custom tab could drop matrix definitions. | `tab-editor.js` preserves both LaTeX and matrix symbols. |
| Stored matrix labels were interpreted as HTML. | Labels render as text; palette buttons receive accessible names. |
| History/snippet rows lacked keyboard activation. | `entry-list.js` supports focus and Enter/Space, with labelled delete controls. |
| License requests could remain pending indefinitely or accept incomplete store metadata. | `license.js` adds timeouts, service/JSON error messages, and required store validation. |

## Typography, surfaces, and controls

| Before | After |
| --- | --- |
| The shell and editor had competing chrome and decorative effects. | `desktop.css`, `desktop-mode.css`, and the HTML use one branded title bar, a clean editor toolbar, quiet slate surfaces, and consistent radii. |
| Light themes left the outer shell dark. | `settings.js` communicates the theme to the shell; surfaces and text use shared semantic colors. |
| Dark-only shadows and glows carried into light controls. | Light/dark button, palette, and toolbar styles use restrained borders/shadows and clear active states. |
| Toolbar controls were small and an always-on-top state was implicit. | Toolbar buttons have 40px targets; a labelled pin button controls the actual native state. |
| Decorative switch sliders covered the underlying inputs. | Sliders ignore pointer events; full switch targets remain clickable and keyboard-focusable. |
| Settings exposed controls overridden by desktop layout. | Inapplicable controls are hidden, invalid stored values are clamped, and symbol-height settings respect the 40px minimum. |
| Footer actions and source output could overflow compact windows. | The footer wraps responsively, actions stay visible, and source/palette areas scroll. |
| The equation placeholder was rendered as italic math. | The placeholder uses MathLive text syntax; the field has an accessible name. |
| Copy confirmation could cover the footer. | The shell toast sits above the actions, and buttons provide their own success feedback. |
| Pro badges had inconsistent geometry. | Badge height, padding, positioning, color, and shadow are normalized. |
| Heading/paragraph wrapping and changing numeric values lacked explicit rules. | Headings use balanced wrapping, prose uses pretty wrapping, and setting values use tabular numerals. |

## Dialog and motion behavior

| Before | After |
| --- | --- |
| Escape could hide the app while an upgrade dialog was open. | `dialogs.js` dismisses the top dialog first, then `shortcuts.js` handles keyboard/matrix/app dismissal. |
| Dialogs lacked consistent focus management. | Dialogs receive names and modal semantics; the background is inert, Tab is contained, and focus returns on close. |
| Floating keyboard/matrix controls could remain open over dialogs. | Opening a dialog hides transient editor controls. |
| Controls lacked consistent visible keyboard focus. | Buttons, links, switches, ranges, summaries, and entry rows receive focus-visible styling. |
| Broad/decorative motion was unsuitable for a desktop utility. | Interactive transitions name their properties; pressed feedback is restrained and reduced-motion preferences are respected. |

## Desktop integration, security, and verification

| Before | After |
| --- | --- |
| Disabled XDG autostart entries were treated as enabled merely because a file existed. | `autostart.js` respects disabled entries; failed UI requests re-enable the switch. |
| Special characters and percent signs in launcher paths could break execution. | Exec arguments use both Desktop Entry escaping layers and literal-percent escaping. |
| App startup could overwrite a manually customized user launcher. | `desktop-entry.js` only rewrites launchers marked as managed. |
| Privileged IPC had limited argument/sender validation. | `main.js` requires the local main frame, validates autostart/clipboard input, and checks copy-hide revisions. |
| The editor lacked an explicit content security policy. | Local scripts/assets and the license endpoint are explicitly scoped; Node integration remains disabled. |
| D-Bus pulled in an old XML parser and unused vulnerable native-build/download dependencies. | A patched XML parser override plus `.npmrc` optional-dependency omission gives a clean installed audit; packaged files exclude `usocket`, `request`, and `node-gyp`. |
| Syntax checks covered only a subset of app files. | `test/check.cjs` covers 45 app/test/build JavaScript files and checks the launcher shell syntax. |
| No reproducible complete desktop workflow suite existed. | `test/desktop.e2e.cjs` exercises 18 scenarios in a temporary profile, captures screenshots, and restarts the actual Electron app. |
| Native dependency behavior was not integration-tested independently. | `test/dbus.integration.cjs` tests XML introspection and shortcut subscription on an isolated D-Bus session. |
| Documentation described aspect-locked scaling and ambiguous shortcut errors. | `README.md` documents responsive layout, persistence, keyboard/clipboard behavior, reproducible tests, and platform limits. |

## Verification scope

Unit suite: 46 passing tests. Syntax checks: 45 JavaScript files plus the shell launcher. Isolated D-Bus integration:
passing. The 18-scenario Electron suite is run against source and packaged builds,
with zero uncaught renderer errors or GPU-process crashes in passing runs.
Screenshots cover the empty editor, light theme, compact window, settings, and
virtual keyboard. Test licensing uses intercepted responses, not a real purchase
or activation. Test data and screenshots are confined to `/tmp/mathpaster-e2e-*`.

Final verification runs:

| Check | Result |
| --- | --- |
| `npm test` | 46 passed |
| `npm run check` | 45 JavaScript files and launcher shell syntax passed |
| `git diff --check` | Passed |
| Isolated D-Bus integration | Passed |
| Source Electron end-to-end suite | 18 passed; native mapping checked; screenshots in `/tmp/mathpaster-e2e-1hKysG` |
| Final AppImage end-to-end suite (including a second launch) | 18 passed; native mapping checked; screenshots in `/tmp/mathpaster-e2e-oCpg9F` |
| Installed production dependency audit (optional dependencies omitted) | 0 known vulnerabilities |
| Packaged dependency inspection | XML parser 0.6.2; unused native socket/build/download modules absent |
| Distributables | Final AppImage and RPM built successfully; RPM metadata verified as MathPaster 1.0.0 x86_64 with xz compression |

This is not a claim that every possible bug is eliminated. Physical global
shortcuts from other applications, GNOME/native-Wayland portal permissions, real
paid-license transactions, real login/reboot autostart, and multiple physical
monitor/DPI configurations still require environment-specific checks. The suite
does test the focused Alt+M interception and hidden-start/relaunch paths. Pure
Wayland delegates global positioning to the compositor; X11/XWayland is used
when available for exact position restoration.

## Invisible-window regression: September 5 follow-up

The earlier 17-scenario runs checked Electron visibility and rendered screenshots,
but did **not** establish that KWin had a real mapped application window. A normal
launch could appear in Plasma's panel while remaining absent from KWin's window
list. Saved bounds were valid; resetting the user's data was not necessary.

Root cause: the `ozone-platform=x11` switch was appended from `main.js`, after
Electron 44 initialized its browser-side Ozone backend. Child processes selected
X11 while the browser retained Wayland. The failing run returned native handle
`0x1`, absent from `_NET_CLIENT_LIST`. Passing the same switch on the initial
command line produced a real, mapped X11 window and passed the workflow suite.

`src/launch.sh` now selects the backend before executing Electron. The packaging
hook installs that launcher for both distribution formats, and source, desktop,
and autostart launch paths preserve it. Arguments with spaces, hidden starts,
native-Wayland fallback, explicit overrides, and RPM-style symlinks have regression
tests. The main process reads the selected backend and never changes Ozone late.

The strengthened suite checks the native desktop window list and normal window
state after launch/reopen/restart. It also launches the app normally a second time
to reveal hidden and minimized windows without creating a duplicate instance.
The user's real AppImage was gracefully restarted without deleting profile data:
KWin/X11 reported native window `0x3a00004`, process `1064020`, normal and above
other windows, and startup confirmed successful Alt+M registration.

## Implementation references

Frame-local keyboard behavior follows [MathLive's virtual keyboard guide](https://mathlive.io/mathfield/guides/virtual-keyboard/).
Launcher escaping follows the [Desktop Entry Exec specification](https://specifications.freedesktop.org/desktop-entry/latest/exec-variables.html).
Disabled launch entries follow the [XDG Autostart specification](https://specifications.freedesktop.org/autostart/latest/).
